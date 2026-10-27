<?php

declare(strict_types=1);

namespace App\Integrations\QuranFoundation;

use Illuminate\Contracts\Cache\Repository;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Client\Response;

final class OAuthTokenProvider
{
    public function __construct(
        private readonly Repository $cache,
        private readonly QfConfig $config,
        private readonly QfHttp $http,
    ) {}

    public function token(): string
    {
        $this->guardCredentials();

        $cached = $this->cache->get($this->config->tokenCacheKey());

        if (is_string($cached) && $cached !== '') {
            return $cached;
        }

        $response = $this->requestToken();
        $token = $this->accessToken($response);
        $ttl = max(1, $this->expiresIn($response) - $this->config->tokenRefreshMargin);

        $this->cache->put($this->config->tokenCacheKey(), $token, $ttl);

        return $token;
    }

    public function forget(): void
    {
        $this->cache->forget($this->config->tokenCacheKey());
    }

    private function guardCredentials(): void
    {
        if ($this->config->clientId === '' || $this->config->clientSecret === '') {
            throw QuranFoundationException::missingCredentials();
        }
    }

    private function requestToken(): Response
    {
        try {
            $response = $this->http->pending()
                ->withBasicAuth($this->config->clientId, $this->config->clientSecret)
                ->asForm()
                ->post($this->config->authBase.'/oauth2/token', [
                    'grant_type' => 'client_credentials',
                    'scope' => 'content',
                ]);
        } catch (RequestException $exception) {
            $response = $exception->response;
        } catch (ConnectionException $exception) {
            throw QuranFoundationException::unreachable($exception);
        }

        if (! $response->successful()) {
            throw QuranFoundationException::fromResponse($response);
        }

        return $response;
    }

    private function accessToken(Response $response): string
    {
        $token = $response->json('access_token');

        if (! is_string($token) || $token === '') {
            throw new QuranFoundationException(
                'Quran Foundation token response did not include an access token.',
                $response->status(),
            );
        }

        return $token;
    }

    private function expiresIn(Response $response): int
    {
        $expiresIn = $response->json('expires_in');

        if (! is_int($expiresIn)) {
            throw new QuranFoundationException(
                'Quran Foundation token response did not include an expiry.',
                $response->status(),
            );
        }

        return $expiresIn;
    }
}
