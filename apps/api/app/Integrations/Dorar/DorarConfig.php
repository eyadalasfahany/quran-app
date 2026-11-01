<?php

declare(strict_types=1);

namespace App\Integrations\Dorar;

final readonly class DorarConfig
{
    public function __construct(
        public bool $enabled,
        public string $baseUrl,
        #[\SensitiveParameter]
        public string $token,
        public string $tokenHeader,
        public string $tokenPrefix,
        public int $timeoutSeconds,
        public int $maxRequestsPerMinute,
        public int $cacheTtlSeconds,
    ) {}

    public static function fromConfig(): self
    {
        return new self(
            enabled: self::boolean('enabled'),
            baseUrl: rtrim(self::string('base_url'), '/'),
            token: self::string('token'),
            tokenHeader: self::string('token_header'),
            tokenPrefix: self::string('token_prefix'),
            timeoutSeconds: max(1, self::integer('timeout_seconds')),
            maxRequestsPerMinute: max(1, self::integer('max_requests_per_minute')),
            cacheTtlSeconds: max(0, self::integer('cache_ttl_seconds')),
        );
    }

    /**
     * Dorar is used only when a token is configured and the feature flag is on (ADR 0031 §2).
     */
    public function isAvailable(): bool
    {
        return $this->enabled && $this->token !== '';
    }

    private static function string(string $key): string
    {
        $value = config('services.dorar.'.$key);

        if (! is_string($value)) {
            throw new DorarConfigException('Dorar config ['.$key.'] must be a string.');
        }

        return $value;
    }

    private static function integer(string $key): int
    {
        $value = config('services.dorar.'.$key);

        if (! is_int($value)) {
            throw new DorarConfigException('Dorar config ['.$key.'] must be an integer.');
        }

        return $value;
    }

    private static function boolean(string $key): bool
    {
        $value = config('services.dorar.'.$key);

        if (! is_bool($value)) {
            throw new DorarConfigException('Dorar config ['.$key.'] must be a boolean.');
        }

        return $value;
    }
}
