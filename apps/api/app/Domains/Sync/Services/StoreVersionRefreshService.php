<?php

declare(strict_types=1);

namespace App\Domains\Sync\Services;

use App\Domains\Sync\Enums\AppPlatform;
use App\Domains\Sync\Repositories\Contracts\LatestStoreVersionRepository;
use App\Integrations\AppStores\AppleStoreClient;
use App\Integrations\AppStores\PlayStoreClient;
use Illuminate\Support\Facades\Log;

/**
 * Looks up the live version in each store and stores it (ADR 0060). A failed lookup keeps the last known version,
 * so one store's outage never lowers or clears the other store's minimum.
 */
final readonly class StoreVersionRefreshService
{
    public function __construct(
        private AppleStoreClient $apple,
        private PlayStoreClient $play,
        private LatestStoreVersionRepository $versions,
    ) {}

    public function refresh(): void
    {
        foreach (AppPlatform::cases() as $platform) {
            $version = $this->lookup($platform);

            if ($version === null) {
                Log::warning("App store version lookup failed for {$platform->value}; keeping the last known version.", [
                    'store' => $platform->value,
                ]);

                continue;
            }

            $this->versions->put($platform, $version);
        }
    }

    private function lookup(AppPlatform $platform): ?string
    {
        return match ($platform) {
            AppPlatform::Ios => $this->apple->latestVersion(
                (string) config('mobile_app.app_store_id'),
                (string) config('mobile_app.bundle_id'),
            ),
            AppPlatform::Android => $this->play->latestVersion((string) config('mobile_app.bundle_id')),
        };
    }
}
