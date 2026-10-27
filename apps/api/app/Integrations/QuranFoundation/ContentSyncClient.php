<?php

declare(strict_types=1);

namespace App\Integrations\QuranFoundation;

use Generator;

final class ContentSyncClient
{
    private readonly QfResponseParser $parser;

    public function __construct(
        private readonly QfApi $api,
        private readonly QfConfig $config,
    ) {
        $this->parser = new QfResponseParser;
    }

    /**
     * @return Generator<int, SyncPage>
     */
    public function sync(string $resources, ?string $syncToken = null, bool $bootstrap = false): Generator
    {
        $url = $this->api->resolve('/api/v4/resources/sync');
        $query = $this->syncQuery($resources, $syncToken, $bootstrap);
        /** @var array<string, true> $seen */
        $seen = [];

        while (true) {
            if (isset($seen[$url])) {
                throw new QuranFoundationException('Quran Foundation sync returned a repeated page URL.');
            }

            $seen[$url] = true;
            $page = $this->parser->syncPage($this->api->get($url, $query));
            $query = null;

            yield $page;

            if (! $page->hasMore) {
                return;
            }

            if ($page->nextPageUrl === null || $page->nextPageUrl === '') {
                throw new QuranFoundationException('Quran Foundation sync reported more pages without a next page URL.');
            }

            $url = $this->api->resolve($page->nextPageUrl);
        }
    }

    public function snapshot(string $snapshotUrlOrPath): Snapshot
    {
        return $this->parser->snapshot($this->api->get($snapshotUrlOrPath));
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
}
