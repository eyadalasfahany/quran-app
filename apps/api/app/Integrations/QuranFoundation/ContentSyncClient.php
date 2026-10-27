<?php

declare(strict_types=1);

namespace App\Integrations\QuranFoundation;

use Generator;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Client\Response;

final class ContentSyncClient
{
    private readonly QfResponseParser $parser;

    public function __construct(
        private readonly OAuthTokenProvider $tokens,
        private readonly QfConfig $config,
        private readonly QfHttp $http,
    ) {
        $this->parser = new QfResponseParser;
    }

    /**
     * @return Generator<int, SyncPage>
     */
    public function sync(string $resources, ?string $syncToken = null, bool $bootstrap = false): Generator
    {
        $url = $this->resolve('/api/v4/resources/sync');
        $query = $this->syncQuery($resources, $syncToken, $bootstrap);
        /** @var array<string, true> $seen */
        $seen = [];

        while (true) {
            if (isset($seen[$url])) {
                throw new QuranFoundationException('Quran Foundation sync returned a repeated page URL.');
            }

            $seen[$url] = true;
            $page = $this->parser->syncPage($this->jsonObject($this->get($url, $query)));
            $query = null;

            yield $page;

            if (! $page->hasMore) {
                return;
            }

            if ($page->nextPageUrl === null || $page->nextPageUrl === '') {
                throw new QuranFoundationException('Quran Foundation sync reported more pages without a next page URL.');
            }

            $url = $this->resolve($page->nextPageUrl);
        }
    }

    public function snapshot(string $snapshotUrlOrPath): Snapshot
    {
        return $this->parser->snapshot($this->jsonObject($this->get($this->resolve($snapshotUrlOrPath))));
    }

    /**
     * @param  array<string, int|string>|null  $query
     */
    private function get(string $url, ?array $query = null, bool $authRetried = false): Response
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

            return $this->get($url, $query, true);
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
     * @return array<string, int|string>
     */
    private function syncQuery(string $resources, ?string $syncToken, bool $bootstrap): array
    {
        $query = [
            'resources' => $resources,
            'per_page' => $this->config->perPage,
        ];

        if ($bootstrap) {
            $query['bootstrap'] = 'true';

            return $query;
        }

        if ($syncToken !== null) {
            $query['sync_token'] = $syncToken;
        }

        return $query;
    }

    /**
     * Relative paths start with /api/v4 and are joined to this environment's API base.
     * An absolute URL keeps its path and query, but the host always comes from config.
     */
    private function resolve(string $pathOrUrl): string
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
