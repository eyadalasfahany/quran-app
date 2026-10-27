<?php

declare(strict_types=1);

namespace App\Integrations\QuranFoundation;

use Carbon\CarbonImmutable;
use Carbon\Exceptions\InvalidFormatException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Throwable;

final class QfHttp
{
    /**
     * A Retry-After above this is clamped, so one 429 can't stall a sync job for long.
     */
    private const int MAX_RETRY_AFTER_MS = 30_000;

    public function __construct(private readonly QfConfig $config) {}

    public function pending(): PendingRequest
    {
        return Http::acceptJson()
            ->connectTimeout($this->config->timeout)
            ->timeout($this->config->timeout)
            ->withUserAgent($this->config->userAgent())
            ->withOptions(['allow_redirects' => false])
            ->retry(
                $this->config->retries,
                fn (int $attempt, mixed $exception): int => $this->delay($attempt, $exception),
                fn (Throwable $exception): bool => $this->shouldRetry($exception),
            );
    }

    private function shouldRetry(Throwable $exception): bool
    {
        if ($exception instanceof ConnectionException) {
            return true;
        }

        if (! $exception instanceof RequestException) {
            return false;
        }

        $status = $exception->response->status();

        return $status === 429 || $status >= 500;
    }

    private function delay(int $attempt, mixed $exception): int
    {
        if ($exception instanceof RequestException && $exception->response->status() === 429) {
            $retryAfter = $this->retryAfterMilliseconds($exception->response->header('Retry-After'));

            if ($retryAfter !== null) {
                return min($retryAfter, self::MAX_RETRY_AFTER_MS);
            }
        }

        return 200 * max(1, $attempt);
    }

    private function retryAfterMilliseconds(string $header): ?int
    {
        $header = trim($header);

        if ($header === '') {
            return null;
        }

        if (preg_match('/^\d+$/', $header) === 1) {
            return (int) $header * 1000;
        }

        try {
            $retryAt = CarbonImmutable::parse($header);
        } catch (InvalidFormatException) {
            return null;
        }

        return max(0, $retryAt->getTimestamp() - now()->getTimestamp()) * 1000;
    }
}
