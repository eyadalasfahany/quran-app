<?php

declare(strict_types=1);

namespace App\Domains\Sync\Repositories\Cache;

use App\Domains\Sync\Enums\AppPlatform;
use App\Domains\Sync\Repositories\Contracts\LatestStoreVersionRepository;
use Illuminate\Contracts\Cache\Repository as Cache;

/**
 * Keeps the last known live store version per platform. Kept forever: the refresh job overwrites it, and a
 * failed lookup leaves the last known value in place.
 */
final readonly class CacheLatestStoreVersionRepository implements LatestStoreVersionRepository
{
    public function __construct(private Cache $cache) {}

    public function get(AppPlatform $platform): ?string
    {
        $version = $this->cache->get($this->key($platform));

        return is_string($version) && $version !== '' ? $version : null;
    }

    public function put(AppPlatform $platform, string $version): void
    {
        $this->cache->forever($this->key($platform), $version);
    }

    private function key(AppPlatform $platform): string
    {
        return 'app_store:latest_version:'.$platform->value;
    }
}
