<?php

declare(strict_types=1);

namespace App\Domains\Sync\Services;

use App\Domains\Sync\Data\BootstrapData;
use App\Domains\Sync\Enums\AppPlatform;
use App\Domains\Sync\Repositories\Contracts\LatestStoreVersionRepository;

final readonly class BootstrapService
{
    public function __construct(private LatestStoreVersionRepository $versions) {}

    /**
     * The minimum app version per platform is the live store version, refreshed every 15 minutes (ADR 0060).
     * A null means no store version is known yet, so no force update. The store links come from config.
     */
    public function current(): BootstrapData
    {
        return new BootstrapData(
            minAppVersionIos: $this->versions->get(AppPlatform::Ios),
            minAppVersionAndroid: $this->versions->get(AppPlatform::Android),
            storeUrlIos: config()->string('mobile_app.store_url.ios'),
            storeUrlAndroid: config()->string('mobile_app.store_url.android'),
        );
    }
}
