<?php

declare(strict_types=1);

namespace App\Integrations\Dorar;

use Carbon\CarbonImmutable;
use Carbon\Exceptions\InvalidFormatException;
use Illuminate\Contracts\Cache\Repository as Cache;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;

/**
 * Transport only: the token header, the app-wide per-minute limit, optional caching and error mapping.
 * It knows no endpoint paths or response fields; the mapper owns those once Dorar documents them.
 */
final class DorarClient
{
    private const string RATE_LIMITER_KEY = 'dorar.api';

    public function __construct(
        private readonly DorarConfig $config,
        private readonly Cache $cache,
    ) {}

    /**
     * @param  array<string, int|string>  $query
     * @return array<string, mixed>
     */
    public function get(string $path, array $query = []): array
    {
        if ($this->config->cacheTtlSeconds === 0) {
            return $this->send($path, $query);
        }

        /** @var array<string, mixed> */
        return $this->cache->remember(
            $this->cacheKey($path, $query),
            $this->config->cacheTtlSeconds,
            fn (): array => $this->send($path, $query),
        );
    }

    /**
     * @param  array<string, int|string>  $query
     * @return array<string, mixed>
     */
    private function send(string $path, array $query): array
    {
        $this->consumeRateLimit();

        try {
            $response = Http::acceptJson()
                ->withHeaders([
                    $this->config->tokenHeader => $this->config->tokenPrefix.$this->config->token,
                    'User-Agent' => 'Taybah/1.0',
                ])
                ->timeout($this->config->timeoutSeconds)
                ->connectTimeout($this->config->timeoutSeconds)
                ->get($this->url($path), $query);
        } catch (ConnectionException) {
            // The previous exception is dropped on purpose: transport errors can echo request headers, which carry the token.
            throw new DorarRequestException('Dorar could not be reached.');
        }

        return $this->decode($response);
    }

    private function consumeRateLimit(): void
    {
        $key = self::RATE_LIMITER_KEY;

        if (RateLimiter::tooManyAttempts($key, $this->config->maxRequestsPerMinute)) {
            throw new DorarRateLimitedException(RateLimiter::availableIn($key));
        }

        RateLimiter::hit($key, 60);
    }

    /**
     * @return array<string, mixed>
     */
    private function decode(Response $response): array
    {
        if ($response->status() === 429) {
            throw new DorarRateLimitedException($this->retryAfterSeconds($response));
        }

        if (! $response->successful()) {
            throw new DorarRequestException('Dorar request failed.', $response->status());
        }

        $decoded = $response->json();

        if (! is_array($decoded) || ($decoded !== [] && array_is_list($decoded))) {
            throw new DorarRequestException('Dorar returned a response that is not a JSON object.', $response->status());
        }

        /** @var array<string, mixed> $decoded */
        return $decoded;
    }

    private function retryAfterSeconds(Response $response): ?int
    {
        $header = trim($response->header('Retry-After'));

        if ($header === '') {
            return null;
        }

        if (preg_match('/^\d+$/', $header) === 1) {
            return (int) $header;
        }

        try {
            $retryAt = CarbonImmutable::parse($header);
        } catch (InvalidFormatException) {
            return null;
        }

        return max(0, $retryAt->getTimestamp() - now()->getTimestamp());
    }

    private function url(string $path): string
    {
        return $this->config->baseUrl.'/'.ltrim($path, '/');
    }

    /**
     * @param  array<string, int|string>  $query
     */
    private function cacheKey(string $path, array $query): string
    {
        return 'dorar.lookup.'.hash('sha256', $path."\0".json_encode($query, JSON_THROW_ON_ERROR));
    }
}
