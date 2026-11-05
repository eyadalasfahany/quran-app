<?php

declare(strict_types=1);

namespace App\Domains\Sync\Repositories\Contracts;

use App\Domains\Sync\Enums\AppPlatform;

interface LatestStoreVersionRepository
{
    public function get(AppPlatform $platform): ?string;

    public function put(AppPlatform $platform, string $version): void;
}
