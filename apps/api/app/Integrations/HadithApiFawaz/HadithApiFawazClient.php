<?php

declare(strict_types=1);

namespace App\Integrations\HadithApiFawaz;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Transport only (ADR 0042 §3): builds the pinned jsDelivr URL and downloads one pinned file. It decodes nothing, checks no
 * hash and writes nothing; the Hadith domain verifies and stores the bytes. Pattern: HisnMuslimSnapshotter::fetch().
 */
final class HadithApiFawazClient
{
    private const int CONNECT_TIMEOUT_SECONDS = 10;

    private const int MAX_RETRY_AFTER_SECONDS = 60;

    public function __construct(private readonly HadithApiFawazConfig $config) {}

    /**
     * @throws HadithApiFawazPathException
     */
    public function url(string $path): string
    {
        $this->assertPinnedPath($path);

        return $this->config->cdnBase.'@'.$this->config->commit.'/'.$path;
    }

    /**
     * The body bytes exactly as received.
     *
     * @throws HadithApiFawazPathException
     * @throws HadithApiFawazNotFoundException
     * @throws HadithApiFawazRequestException
     * @throws HadithApiFawazBodyException
     */
    public function fetch(string $path): string
    {
        $url = $this->url($path);

        try {
            $response = Http::withUserAgent($this->config->userAgent)
                ->timeout($this->config->timeoutSeconds)
                ->connectTimeout(min(self::CONNECT_TIMEOUT_SECONDS, $this->config->timeoutSeconds))
                ->retry(
                    $this->config->tries,
                    fn (int $attempt, Throwable $exception): int => $this->delayMs($attempt, $exception),
                    fn (Throwable $exception): bool => $this->shouldRetry($exception),
                    throw: true,
                )
                ->get($url)
                ->throw();
        } catch (ConnectionException) {
            throw new HadithApiFawazRequestException('The source could not be reached for ['.$path.'].');
        } catch (RequestException $exception) {
            $status = $exception->response->status();

            if ($status === 404) {
                throw new HadithApiFawazNotFoundException('The pinned file ['.$path.'] was not found at the pinned commit.');
            }

            throw new HadithApiFawazRequestException('The source answered HTTP '.$status.' for ['.$path.'].', $status);
        }

        $body = $response->body();
        $size = strlen($body);

        if ($size === 0) {
            throw new HadithApiFawazBodyException('The pinned file ['.$path.'] came back empty.');
        }

        if ($size > $this->config->maxBytes) {
            throw new HadithApiFawazBodyException('The pinned file ['.$path.'] is '.$size.' bytes, over the limit of '.$this->config->maxBytes.' bytes.');
        }

        $declared = $response->header('Content-Length');

        if (ctype_digit($declared) && (int) $declared !== $size) {
            throw new HadithApiFawazBodyException('The pinned file ['.$path.'] was truncated: Content-Length '.$declared.', received '.$size.' bytes.');
        }

        return $body;
    }

    /**
     * Connection errors, 429 and 5xx are retried. Other client errors fail at once.
     */
    private function shouldRetry(Throwable $exception): bool
    {
        if ($exception instanceof ConnectionException) {
            return true;
        }

        if ($exception instanceof RequestException) {
            $status = $exception->response->status();

            return $status === 429 || $status >= 500;
        }

        return false;
    }

    /**
     * Exponential backoff from the configured base. A 429 with a short numeric Retry-After waits that many seconds instead.
     */
    private function delayMs(int $attempt, Throwable $exception): int
    {
        if ($exception instanceof RequestException && $exception->response->status() === 429) {
            $retryAfter = $exception->response->header('Retry-After');

            if (ctype_digit($retryAfter) && (int) $retryAfter <= self::MAX_RETRY_AFTER_SECONDS) {
                return (int) $retryAfter * 1000;
            }
        }

        return $this->config->retryDelayMs * 2 ** ($attempt - 1);
    }

    /**
     * @throws HadithApiFawazPathException
     */
    private function assertPinnedPath(string $path): void
    {
        if (! in_array($path, $this->config->allowedPaths, true)) {
            throw new HadithApiFawazPathException('The path ['.$path.'] is not a pinned file; nothing was requested.');
        }
    }
}
