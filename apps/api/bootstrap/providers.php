<?php

declare(strict_types=1);

use App\Domains\Sync\SyncServiceProvider;
use App\Integrations\QuranFoundation\QuranFoundationServiceProvider;
use App\Providers\AppServiceProvider;
use App\Providers\HorizonServiceProvider;

return [
    AppServiceProvider::class,
    HorizonServiceProvider::class,
    SyncServiceProvider::class,
    QuranFoundationServiceProvider::class,
];
