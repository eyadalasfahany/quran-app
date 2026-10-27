<?php

declare(strict_types=1);

namespace App\Integrations\QuranFoundation;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Client\Response;

/**
 * Authenticated GET against the current Quran Foundation environment.
 * Content clients share this instead of copying headers, retries, or URL resolution.
 */
final class QfApi
{
    public function __construct(
        private readonly OAuthTokenProvider $tokens,
        private readonly QfConfig $config,
        private readonly QfHttp $http,
    ) {}

    /**
     * @param  array<string, int|string>|null  $query
     * @return array<string, mixed>
     */
    public function get(string $pathOrUrl, ?array $query = null): array
    {
        return $this->jsonObject($this->request($this->resolve($pathOrUrl), $query));
    }

    /**
     * Relative paths start with /api/v4 and are joined to this environment's API base.
     * An absolute URL keeps its path and query, but the host always comes from config.
     */
    public function resolve(string $pathOrUrl): string
    {
        $pathOrUrl = trim($pathOrUrl);

        if ($pathOrUrl === '' || str_starts_with($pathOrUrl, '//')) {
            throw new QuranFoundationException('Quran Foundation returned a URL that could not be resolved.');
        }

        $base = rtrim($this->config->apiBase, '/');

        if (str_starts_with($pathOrUrl, '/')) {
            return $base.$pathOrUrl;
        }

        $parts = parse_url($pathOrUrl);

        if ($parts === false || ! isset($parts['path']) || ! str_starts_with($parts['path'], '/')) {
            throw new QuranFoundationException('Quran Foundation returned a URL that could not be resolved.');
        }

        $path = $parts['path'];
        $basePath = parse_url($base, PHP_URL_PATH);

        if (is_string($basePath) && $basePath !== '' && $basePath !== '/' && str_starts_with($path, $basePath.'/')) {
            $path = substr($path, strlen($basePath));
        }

        $query = isset($parts['query']) ? '?'.$parts['query'] : '';

        return $base.$path.$query;
    }

    /**
     * @param  array<string, int|string>|null  $query
     */
    private function request(string $url, ?array $query, bool $authRetried = false): Response
    {
        try {
            $pending = $this->http->pending()->withHeaders($this->headers());
            $response = $query === null ? $pending->get($url) : $pending->get($url, $query);
        } catch (RequestException $exception) {
            $response = $exception->response;
        } catch (ConnectionException $exception) {
            throw QuranFoundationException::unreachable($exception);
        }

        if ($response->unauthorized() && ! $authRetried) {
            $this->tokens->forget();

            return $this->request($url, $query, true);
        }

        if (! $response->successful()) {
            throw QuranFoundationException::fromResponse($response);
        }

        return $response;
    }

    /**
     * @return array<string, string>
     */
    private function headers(): array
    {
        return [
            'x-auth-token' => $this->tokens->token(),
            'x-client-id' => $this->config->clientId,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function jsonObject(Response $response): array
    {
        $decoded = $response->json();

        if (! is_array($decoded) || ($decoded !== [] && array_is_list($decoded))) {
            throw new QuranFoundationException(
                'Quran Foundation returned a response that is not a JSON object.',
                $response->status(),
            );
        }

        /** @var array<string, mixed> $decoded */
        return $decoded;
    }
}
