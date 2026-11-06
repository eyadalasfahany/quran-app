<?php

declare(strict_types=1);

namespace App\Integrations\HadithApiFawaz;

/**
 * Validated transport settings for the pinned fawazahmed0 download (ADR 0042 §3, step 5). Read from config/hadith.php.
 */
final readonly class HadithApiFawazConfig
{
    /**
     * @param  list<string>  $allowedPaths  The pinned file paths; nothing else is ever requested.
     */
    public function __construct(
        public string $cdnBase,
        public string $commit,
        public array $allowedPaths,
        public int $timeoutSeconds,
        public int $tries,
        public int $retryDelayMs,
        public int $maxBytes,
        public string $userAgent,
    ) {}

    /**
     * @throws HadithApiFawazConfigException
     */
    public static function fromConfig(): self
    {
        $commit = self::string('commit');

        if (preg_match('/^[0-9a-f]{40}$/', $commit) !== 1) {
            throw new HadithApiFawazConfigException('Config [hadith.commit] must be a full 40-character lowercase hex SHA.');
        }

        $cdnBase = rtrim(self::string('cdn_base'), '/');

        if ($cdnBase === '' || str_contains($cdnBase, '@')) {
            throw new HadithApiFawazConfigException('Config [hadith.cdn_base] must be a URL without a revision.');
        }

        $files = config('hadith.files');

        if (! is_array($files) || $files === []) {
            throw new HadithApiFawazConfigException('Config [hadith.files] must list the pinned files.');
        }

        $allowedPaths = [];

        foreach (array_keys($files) as $path) {
            if (! is_string($path) || $path === '') {
                throw new HadithApiFawazConfigException('Config [hadith.files] must be keyed by file path.');
            }

            $allowedPaths[] = $path;
        }

        $email = config('quran.qf.contact_email');
        $userAgent = is_string($email) && $email !== '' ? 'Taybah/1.0 (+mailto:'.$email.')' : 'Taybah/1.0';

        return new self(
            cdnBase: $cdnBase,
            commit: $commit,
            allowedPaths: $allowedPaths,
            timeoutSeconds: max(1, self::integer('download.timeout_seconds')),
            tries: max(1, self::integer('download.tries')),
            retryDelayMs: max(0, self::integer('download.retry_delay_ms')),
            maxBytes: max(1, self::integer('download.max_bytes')),
            userAgent: $userAgent,
        );
    }

    private static function value(string $key): mixed
    {
        return config('hadith.'.$key);
    }

    private static function string(string $key): string
    {
        $value = self::value($key);

        if (! is_string($value)) {
            throw new HadithApiFawazConfigException('Config [hadith.'.$key.'] must be a string.');
        }

        return $value;
    }

    private static function integer(string $key): int
    {
        $value = self::value($key);

        if (! is_int($value)) {
            throw new HadithApiFawazConfigException('Config [hadith.'.$key.'] must be an integer.');
        }

        return $value;
    }
}
