<?php

declare(strict_types=1);

namespace App\Support\ProblemDetails;

use Illuminate\Http\JsonResponse;

/**
 * RFC 9457 problem details, the error body for every /api/v1 response (spec section 8).
 */
final readonly class ProblemDetails
{
    /**
     * @param  array<string, list<string>>|null  $errors  field => messages, only for 422
     * @param  array<string, string>  $headers
     */
    public function __construct(
        public int $status,
        public string $code,
        public string $title,
        public ?string $detail = null,
        public ?array $errors = null,
        public array $headers = [],
        public string $type = 'about:blank',
    ) {}

    public function toResponse(): JsonResponse
    {
        $body = [
            'type' => $this->type,
            'title' => $this->title,
            'status' => $this->status,
            'code' => $this->code,
        ];

        if ($this->detail !== null) {
            $body['detail'] = $this->detail;
        }

        if ($this->errors !== null) {
            $body['errors'] = $this->errors;
        }

        return new JsonResponse(
            data: $body,
            status: $this->status,
            headers: [...$this->headers, 'Content-Type' => 'application/problem+json'],
        );
    }
}
