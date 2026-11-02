<?php

declare(strict_types=1);

namespace App\Integrations\Dorar;

final readonly class DorarConfig
{
    public function __construct(
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
     * Dorar is used only when both a base URL and a token are configured (ADR 0031 §2, ADR 0045). Otherwise the null
     * source answers and no request is made. A credential is not a switch.
     */
    public function isAvailable(): bool
    {
        return $this->baseUrl !== '' && $this->token !== '';
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
}
