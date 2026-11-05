<?php

declare(strict_types=1);

namespace App\Domains\Sync\Data;

use Spatie\LaravelData\Data;

final class BootstrapData extends Data
{
    public function __construct(
        public readonly ?string $minAppVersionIos,
        public readonly ?string $minAppVersionAndroid,
        public readonly string $storeUrlIos,
        public readonly string $storeUrlAndroid,
    ) {}
}
