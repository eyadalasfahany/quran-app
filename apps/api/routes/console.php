<?php

declare(strict_types=1);

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Jobs\PruneContentChangesJob;
use App\Domains\Content\Jobs\SyncQuranFoundationJob;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

$groups = config('quran.sync.groups');

if (is_array($groups)) {
    foreach ($groups as $group => $filter) {
        if (! is_string($group) || ! is_string($filter)) {
            continue;
        }

        $resourceGroup = ResourceGroup::tryFrom($group);

        if ($resourceGroup === null) {
            continue;
        }

        Schedule::job(new SyncQuranFoundationJob($resourceGroup, $filter))
            ->dailyAt('02:00')
            ->timezone('UTC');
    }
}

Schedule::job(new PruneContentChangesJob)
    ->daily()
    ->timezone('UTC');
