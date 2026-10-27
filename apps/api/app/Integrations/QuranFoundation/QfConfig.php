<?php

declare(strict_types=1);

namespace App\Integrations\QuranFoundation;

final readonly class QfConfig
{
    public function __construct(
        public QfEnvironment $environment,
        public string $clientId,
        #[\SensitiveParameter]
        public string $clientSecret,
        public string $contactEmail,
        public string $authBase,
        public string $apiBase,
        public int $timeout,
        public int $retries,
        public int $tokenRefreshMargin,
        public int $perPage,
    ) {}

    public static function fromConfig(): self
    {
        $environment = QfEnvironment::parse(self::string('environment'));
        $hosts = self::hosts($environment);

        return new self(
            environment: $environment,
            clientId: self::string('client_id'),
            clientSecret: self::string('client_secret'),
            contactEmail: self::string('contact_email'),
            authBase: $hosts['auth'],
            apiBase: $hosts['api'],
            timeout: self::integer('timeout'),
            retries: self::integer('retries'),
            tokenRefreshMargin: self::integer('token_refresh_margin'),
            perPage: self::integer('per_page'),
        );
    }

    public function userAgent(): string
    {
        return 'Taybah/1.0 (+mailto:'.$this->contactEmail.')';
    }

    public function tokenCacheKey(): string
    {
        return 'qf.oauth.'.$this->environment->value;
    }

    private static function string(string $key): string
    {
        $value = config('quran.qf.'.$key);

        if (! is_string($value)) {
            throw new QuranFoundationException('Quran Foundation config ['.$key.'] must be a string.');
        }

        return $value;
    }

    private static function integer(string $key): int
    {
        $value = config('quran.qf.'.$key);

        if (! is_int($value)) {
            throw new QuranFoundationException('Quran Foundation config ['.$key.'] must be an integer.');
        }

        return $value;
    }

    /**
     * @return array{auth: string, api: string}
     */
    private static function hosts(QfEnvironment $environment): array
    {
        $hosts = config('quran.qf.hosts');

        if (! is_array($hosts)) {
            throw new QuranFoundationException('Quran Foundation hosts are not configured.');
        }

        $environmentHosts = $hosts[$environment->value] ?? null;

        if (! is_array($environmentHosts)) {
            throw new QuranFoundationException('Quran Foundation hosts are not configured for '.$environment->value.'.');
        }

        $auth = $environmentHosts['auth'] ?? null;
        $api = $environmentHosts['api'] ?? null;

        if (! is_string($auth) || $auth === '' || ! is_string($api) || $api === '') {
            throw new QuranFoundationException('Quran Foundation hosts are not configured for '.$environment->value.'.');
        }

        return [
            'auth' => rtrim($auth, '/'),
            'api' => rtrim($api, '/'),
        ];
    }
}
