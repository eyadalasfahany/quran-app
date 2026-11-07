<?php

declare(strict_types=1);

use App\Domains\Azkar\AzkarImportServiceProvider;
use App\Domains\Azkar\AzkarServiceProvider;
use App\Domains\Content\ContentServiceProvider;
use App\Domains\Duas\DuasServiceProvider;
use App\Domains\Feedback\FeedbackServiceProvider;
use App\Domains\Hadith\HadithImportServiceProvider;
use App\Domains\Hadith\HadithServiceProvider;
use App\Domains\Hadith\HadithSourceServiceProvider;
use App\Domains\Names\NamesServiceProvider;
use App\Domains\Sync\SyncServiceProvider;
use App\Integrations\Dorar\DorarServiceProvider;
use App\Integrations\HadithApiCom\HadithApiComServiceProvider;
use App\Integrations\HadithApiFawaz\HadithApiFawazServiceProvider;
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
    DuasServiceProvider::class,
    NamesServiceProvider::class,
    FeedbackServiceProvider::class,
    HadithApiFawazServiceProvider::class,
    HadithSourceServiceProvider::class,
    HadithApiComServiceProvider::class,
    HadithImportServiceProvider::class,
    HadithServiceProvider::class,
];
