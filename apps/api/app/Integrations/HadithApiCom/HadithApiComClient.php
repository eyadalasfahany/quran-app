<?php

declare(strict_types=1);

namespace App\Integrations\HadithApiCom;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Titles-only client for hadithapi.com (dev-only, ADR 0042 §4a). The key travels only in the apiKey query parameter and never
 * reaches an exception message, a previous exception, a return value or a log. Only ids, titles, numbers and chapter ids are
 * kept; every decoded body is dropped at once.
 */
final class HadithApiComClient
{
    private const int CONNECT_TIMEOUT_SECONDS = 10;

    private const string REDACTED = '[redacted]';

    public function __construct(private readonly HadithApiComConfig $config) {}

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

            $id = $this->idText($item['id'] ?? null);
            $title = $item['chapterArabic'] ?? null;

            if ($id === null || ($title !== null && ! is_string($title))) {
                throw $this->shape('chapters', 1);
            }

            $chapters[] = new HadithApiComChapter($id, is_string($title) && $title !== '' ? $title : null);
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
                $chapterId = is_array($item) ? $this->idText($item['chapterId'] ?? null) : null;

                if ($number === null || $chapterId === null) {
                    throw $this->shape('hadiths', $page);
                }

                $refs[] = new HadithApiComHadithRef($number, $chapterId);
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

        try {
            $response = Http::withUserAgent($this->config->userAgent)
                ->timeout($this->config->timeoutSeconds)
                ->connectTimeout(min(self::CONNECT_TIMEOUT_SECONDS, $this->config->timeoutSeconds))
                ->retry(
                    $this->config->tries,
                    fn (int $attempt): int => $this->config->retryDelayMs * 2 ** ($attempt - 1),
                    fn (Throwable $exception): bool => $this->shouldRetry($exception),
                    throw: false,
                )
                ->get($url, $query + ['apiKey' => $this->config->apiKey]);
        } catch (ConnectionException) {
            throw new HadithApiComRequestException('The title source could not be reached for ['.$label.'].');
        } catch (RequestException $exception) {
            throw new HadithApiComRequestException('The title source answered HTTP '.$exception->response->status().' for ['.$label.'].', $exception->response->status());
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

    private function httpFailure(string $label, Response $response): HadithApiComRequestException
    {
        return new HadithApiComRequestException('The title source answered HTTP '.$response->status().' for ['.$label.'].', $response->status());
    }

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
