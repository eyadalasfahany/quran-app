<?php

declare(strict_types=1);

namespace App\Support\ProblemDetails;

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Contracts\Config\Repository as Config;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

/**
 * Turns any exception thrown under /api/* into problem details with a stable code.
 */
final readonly class ProblemDetailsRenderer
{
    /**
     * Stable machine codes the app can branch on, keyed by HTTP status.
     */
    private const array CODES = [
        Response::HTTP_BAD_REQUEST => 'bad_request',
        Response::HTTP_UNAUTHORIZED => 'unauthenticated',
        Response::HTTP_FORBIDDEN => 'forbidden',
        Response::HTTP_NOT_FOUND => 'not_found',
        Response::HTTP_METHOD_NOT_ALLOWED => 'method_not_allowed',
        Response::HTTP_GONE => 'changes_gone',
        Response::HTTP_CONFLICT => 'conflict',
        Response::HTTP_REQUEST_ENTITY_TOO_LARGE => 'payload_too_large',
        Response::HTTP_UNPROCESSABLE_ENTITY => 'validation_failed',
        Response::HTTP_TOO_MANY_REQUESTS => 'too_many_requests',
        Response::HTTP_INTERNAL_SERVER_ERROR => 'server_error',
        Response::HTTP_SERVICE_UNAVAILABLE => 'service_unavailable',
    ];

    public function __construct(private Config $config) {}

    public function render(Throwable $exception): ProblemDetails
    {
        // Laravel wraps ModelNotFoundException in NotFoundHttpException before render callbacks run.
        $previous = $exception->getPrevious();

        if ($exception instanceof HttpExceptionInterface && $previous instanceof ModelNotFoundException) {
            $exception = $previous;
        }

        return match (true) {
            $exception instanceof ValidationException => $this->problem(
                status: Response::HTTP_UNPROCESSABLE_ENTITY,
                errors: $this->validationErrors($exception),
            ),
            $exception instanceof ModelNotFoundException => $this->problem(
                status: Response::HTTP_NOT_FOUND,
                detail: $this->friendlyNotFoundMessage($exception),
            ),
            $exception instanceof AuthenticationException => $this->problem(Response::HTTP_UNAUTHORIZED),
            $exception instanceof AuthorizationException => $this->problem(Response::HTTP_FORBIDDEN),
            $exception instanceof HttpExceptionInterface => $this->problem(
                status: $exception->getStatusCode(),
                detail: $this->clientDetail($exception),
                headers: $this->stringHeaders($exception->getHeaders()),
            ),
            default => $this->problem(
                status: Response::HTTP_INTERNAL_SERVER_ERROR,
                detail: $this->config->boolean('app.debug') ? $exception->getMessage() : null,
            ),
        };
    }

    /**
     * @param  array<string, list<string>>|null  $errors
     * @param  array<string, string>  $headers
     */
    private function problem(int $status, ?string $detail = null, ?array $errors = null, array $headers = []): ProblemDetails
    {
        $code = self::CODES[$status] ?? 'http_error';

        return new ProblemDetails(
            status: $status,
            code: $code,
            title: $code === 'http_error' ? (Response::$statusTexts[$status] ?? 'Error') : __("problems.{$code}"),
            detail: $detail === '' ? null : $detail,
            errors: $errors,
            headers: $headers,
        );
    }

    /**
     * @return array<string, list<string>>
     */
    private function validationErrors(ValidationException $exception): array
    {
        $errors = [];

        foreach ($exception->errors() as $field => $messages) {
            $errors[(string) $field] = array_values(array_map(strval(...), $messages));
        }

        return $errors;
    }

    /**
     * Domains throw ModelNotFoundException with a friendly message. Laravel's default
     * ("No query results for model [...]") names internal classes, so it is dropped.
     *
     * @param  ModelNotFoundException<Model>  $exception
     */
    private function friendlyNotFoundMessage(ModelNotFoundException $exception): ?string
    {
        $message = $exception->getMessage();

        return str_starts_with($message, 'No query results for model') ? null : $message;
    }

    private function clientDetail(HttpExceptionInterface&Throwable $exception): ?string
    {
        return $exception->getStatusCode() >= Response::HTTP_INTERNAL_SERVER_ERROR ? null : $exception->getMessage();
    }

    /**
     * @param  array<array-key, mixed>  $headers
     * @return array<string, string>
     */
    private function stringHeaders(array $headers): array
    {
        $result = [];

        foreach ($headers as $name => $value) {
            if (is_string($name) && (is_string($value) || is_int($value))) {
                $result[$name] = (string) $value;
            }
        }

        return $result;
    }
}
