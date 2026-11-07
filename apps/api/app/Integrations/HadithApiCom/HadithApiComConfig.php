<?php

declare(strict_types=1);

namespace App\Integrations\HadithApiCom;

/**
 * Validated settings for the dev-only title source (ADR 0042 §4a). Built from config/hadith.php; the key is read from
 * config('hadith.api_key') only, which is null in production.
 */
final readonly class HadithApiComConfig
{
    /**
     * @param  array<string, string>  $books  Canonical slug => hadithapi.com book slug.
     */
    public function __construct(
        public string $baseUrl,
        public string $apiKey,
        public array $books,
        public int $timeoutSeconds,
        public int $tries,
        public int $retryDelayMs,
        public int $requestGapMs,
        public int $maxRetryAfterSeconds,
        public int $pageSize,
        public int $maxPages,
        public string $userAgent,
    ) {}

    /**
     * Production is refused first, before the key is read.
     *
     * @throws HadithApiComConfigException
     */
    public static function fromConfig(): self
    {
        if (app()->isProduction()) {
            throw new HadithApiComConfigException('The title source is a developer tool and is disabled in production.');
        }

        $key = config('hadith.api_key');

        if (! is_string($key) || $key === '') {
            throw new HadithApiComConfigException('HADITH_API_KEY is not set. Put it in your local apps/api/.env (dev-only).');
        }

        $baseUrl = rtrim((string) self::value('base_url', 'string'), '/');

        if (preg_match('#^https?://\S+$#', $baseUrl) !== 1) {
            throw new HadithApiComConfigException('Config [hadith.title_match.base_url] must be an http(s) URL.');
        }

        $books = self::value('books', 'array');
        $validBooks = [];

        foreach ($books as $canonical => $bookSlug) {
            if (! is_string($canonical) || ! is_string($bookSlug) || $bookSlug === '') {
                throw new HadithApiComConfigException('Config [hadith.title_match.books] must map canonical slugs to book slugs.');
            }

            $validBooks[$canonical] = $bookSlug;
        }

        if ($validBooks === []) {
            throw new HadithApiComConfigException('Config [hadith.title_match.books] must not be empty.');
        }

        $email = config('quran.qf.contact_email');
        $userAgent = is_string($email) && $email !== '' ? 'Taybah/1.0 (+mailto:'.$email.')' : 'Taybah/1.0';

        return new self(
            baseUrl: $baseUrl,
            apiKey: $key,
            books: $validBooks,
            timeoutSeconds: max(1, self::integer('timeout_seconds')),
            tries: max(1, self::integer('tries')),
            retryDelayMs: max(0, self::integer('retry_delay_ms')),
            requestGapMs: max(0, self::integer('request_gap_ms')),
            maxRetryAfterSeconds: max(0, self::integer('max_retry_after_seconds')),
            pageSize: max(1, self::integer('page_size')),
            maxPages: max(1, self::integer('max_pages')),
            userAgent: $userAgent,
        );
    }

    private static function value(string $key, string $type): mixed
    {
        $value = config('hadith.title_match.'.$key);

        if ($type === 'string' && (! is_string($value) || $value === '')) {
            throw new HadithApiComConfigException('Config [hadith.title_match.'.$key.'] must be a non-empty string.');
        }

        if ($type === 'array' && ! is_array($value)) {
            throw new HadithApiComConfigException('Config [hadith.title_match.'.$key.'] must be a list.');
        }

        return $value;
    }

    private static function integer(string $key): int
    {
        $value = config('hadith.title_match.'.$key);

        if (! is_int($value)) {
            throw new HadithApiComConfigException('Config [hadith.title_match.'.$key.'] must be an integer.');
        }

        return $value;
    }
}
