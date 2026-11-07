<?php

declare(strict_types=1);

namespace App\Integrations\HadithApiCom;

use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

/**
 * Titles-only client for hadithapi.com (dev-only, ADR 0042 §4a). The key travels only in the apiKey query parameter and never
 * reaches an exception message, a previous exception, a return value or a log. Only ids, titles, numbers and chapter ids are
 * kept; every decoded body is dropped at once.
 *
 * Requests are paced by request_gap_ms. Waits go through an injectable sleeper (milliseconds), so tests never sleep.
 */
final class HadithApiComClient
{
    private const int CONNECT_TIMEOUT_SECONDS = 10;

    private const string REDACTED = '[redacted]';

    /** @var Closure(int): void */
    private readonly Closure $sleep;

    private bool $requested = false;

    /** Milliseconds slept since the last request was sent. */
    private int $sleptSinceLastRequestMs = 0;

    /**
     * @param  (Closure(int): void)|null  $sleep  Receives milliseconds; defaults to usleep.
     */
    public function __construct(private readonly HadithApiComConfig $config, ?Closure $sleep = null)
    {
        $this->sleep = $sleep ?? static function (int $milliseconds): void {
            usleep($milliseconds * 1000);
        };
    }

    /**
     * @return list<HadithApiComChapter>
     *
     * @throws HadithApiComException
     */
    public function chapters(string $bookSlug): array
    {
        $this->assertBook($bookSlug);

        $json = $this->getJson('chapters', $bookSlug.'/chapters', [], 1);
        $items = $json['chapters'] ?? null;

        if (! is_array($items)) {
            throw $this->shape('chapters', 1);
        }

        $chapters = [];

        foreach ($items as $item) {
            if (! is_array($item)) {
                throw $this->shape('chapters', 1);
            }

            $title = $item['chapterArabic'] ?? null;

            if ($title !== null && ! is_string($title)) {
                throw $this->shape('chapters', 1);
            }

            $chapters[] = new HadithApiComChapter(
                $this->idText($item['chapterNumber'] ?? null),
                is_string($title) && $title !== '' ? $title : null,
            );
        }

        return $chapters;
    }

    /**
     * Every page of the book's hadith references, in the order the API gives them.
     *
     * @return list<HadithApiComHadithRef>
     *
     * @throws HadithApiComException
     */
    public function hadithRefs(string $bookSlug): array
    {
        $this->assertBook($bookSlug);

        $refs = [];
        $page = 1;
        $lastPage = 1;

        do {
            if ($page > $this->config->maxPages) {
                throw new HadithApiComShapeException('Too many pages for [hadiths].');
            }

            $json = $this->getJson('hadiths', 'hadiths', ['book' => $bookSlug, 'paginate' => $this->config->pageSize, 'page' => $page], $page);
            $hadiths = $json['hadiths'] ?? null;
            $data = is_array($hadiths) ? ($hadiths['data'] ?? null) : null;
            $last = is_array($hadiths) ? ($hadiths['last_page'] ?? null) : null;

            if (! is_array($data) || ! is_int($last)) {
                throw $this->shape('hadiths', $page);
            }

            foreach ($data as $item) {
                $number = is_array($item) ? $this->idText($item['hadithNumber'] ?? null) : null;
                $chapterNumber = is_array($item) ? $this->idText($item['chapterId'] ?? null) : null;

                if ($number === null || $chapterNumber === null) {
                    throw $this->shape('hadiths', $page);
                }

                $refs[] = new HadithApiComHadithRef($number, $chapterNumber);
            }

            $lastPage = max(1, $last);
            $page++;
        } while ($page <= $lastPage);

        return $refs;
    }

    /**
     * Replaces the key, its urlencoded form and its rawurlencoded form with a marker.
     */
    public function redact(string $text): string
    {
        $key = $this->config->apiKey;
        $forms = array_values(array_unique([$key, urlencode($key), rawurlencode($key)]));

        return str_replace($forms, self::REDACTED, $text);
    }

    /**
     * @param  array<string, string|int>  $query
     * @return array<array-key, mixed>
     *
     * @throws HadithApiComRequestException
     * @throws HadithApiComShapeException
     */
    private function getJson(string $label, string $path, array $query, int $page): array
    {
        $url = $this->config->baseUrl.'/'.$path;

        for ($attempt = 1; ; $attempt++) {
            $this->paceRequest();

            try {
                $response = Http::withUserAgent($this->config->userAgent)
                    ->timeout($this->config->timeoutSeconds)
                    ->connectTimeout(min(self::CONNECT_TIMEOUT_SECONDS, $this->config->timeoutSeconds))
                    ->get($url, $query + ['apiKey' => $this->config->apiKey]);
            } catch (ConnectionException) {
                if ($attempt >= $this->config->tries) {
                    throw new HadithApiComRequestException('The title source could not be reached for ['.$label.'].');
                }

                $this->pause($this->backoffMilliseconds($attempt));

                continue;
            }

            if ($this->shouldRetryStatus($response->status()) && $attempt < $this->config->tries) {
                $this->pause($this->waitMilliseconds($response, $attempt));

                continue;
            }

            if ($response->failed()) {
                throw $this->httpFailure($label, $response);
            }

            $json = $response->json();

            if (! is_array($json)) {
                throw $this->shape($label, $page);
            }

            return $json;
        }
    }

    /**
     * Waits until request_gap_ms has passed since the previous request started, counting the sleeps already done.
     */
    private function paceRequest(): void
    {
        if ($this->requested) {
            $this->pause(max(0, $this->config->requestGapMs - $this->sleptSinceLastRequestMs));
        }

        $this->requested = true;
        $this->sleptSinceLastRequestMs = 0;
    }

    private function pause(int $milliseconds): void
    {
        if ($milliseconds <= 0) {
            return;
        }

        ($this->sleep)($milliseconds);
        $this->sleptSinceLastRequestMs += $milliseconds;
    }

    /**
     * 429 and 5xx are retried; anything else fails at once.
     */
    private function shouldRetryStatus(int $status): bool
    {
        return $status === 429 || $status >= 500;
    }

    /**
     * A 429 with Retry-After waits that long, capped; everything else uses the exponential backoff.
     */
    private function waitMilliseconds(Response $response, int $attempt): int
    {
        if ($response->status() === 429) {
            $retryAfter = $this->retryAfterSeconds($response);

            if ($retryAfter !== null) {
                return min($retryAfter, $this->config->maxRetryAfterSeconds) * 1000;
            }
        }

        return $this->backoffMilliseconds($attempt);
    }

    /**
     * Attempt n waits retry_delay_ms * 2^(n-1).
     */
    private function backoffMilliseconds(int $attempt): int
    {
        return $this->config->retryDelayMs * 2 ** ($attempt - 1);
    }

    /**
     * Retry-After as delay seconds or as an HTTP date. Null when absent or unreadable.
     */
    private function retryAfterSeconds(Response $response): ?int
    {
        $value = trim($response->header('Retry-After'));

        if ($value === '') {
            return null;
        }

        if (ctype_digit($value)) {
            return (int) $value;
        }

        $timestamp = strtotime($value);

        if ($timestamp === false) {
            return null;
        }

        return max(0, $timestamp - CarbonImmutable::now()->getTimestamp());
    }

    private function httpFailure(string $label, Response $response): HadithApiComRequestException
    {
        return new HadithApiComRequestException('The title source answered HTTP '.$response->status().' for ['.$label.'].', $response->status());
    }

    /**
     * @throws HadithApiComException
     */
    private function assertBook(string $bookSlug): void
    {
        if (! in_array($bookSlug, $this->config->books, true)) {
            throw new HadithApiComException('The book slug is not configured in [hadith.title_match.books]; nothing was requested.');
        }
    }

    private function shape(string $label, int $page): HadithApiComShapeException
    {
        return new HadithApiComShapeException('Unexpected response shape for ['.$label.'] page '.$page.'.');
    }

    /**
     * An id or a number as text. A float is refused: it could have lost digits.
     */
    private function idText(mixed $value): ?string
    {
        if (is_int($value)) {
            return (string) $value;
        }

        return is_string($value) && $value !== '' ? $value : null;
    }
}
