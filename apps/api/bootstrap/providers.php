<?php

declare(strict_types=1);

use App\Domains\Azkar\AzkarImportServiceProvider;
use App\Domains\Azkar\AzkarServiceProvider;
use App\Domains\Content\ContentServiceProvider;
use App\Domains\Sync\SyncServiceProvider;
use App\Integrations\Dorar\DorarServiceProvider;
use App\Integrations\QuranFoundation\QuranFoundationServiceProvider;
use App\Providers\AppServiceProvider;
use App\Providers\HorizonServiceProvider;

return [
    AppServiceProvider::class,
    HorizonServiceProvider::class,
    SyncServiceProvider::class,
    ContentServiceProvider::class,
    QuranFoundationServiceProvider::class,
    DorarServiceProvider::class,
    AzkarServiceProvider::class,
    AzkarImportServiceProvider::class,
];
