<?php

declare(strict_types=1);

namespace App\Domains\Content\Jobs;

use App\Domains\Content\Repositories\Contracts\ContentChangeRepository;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

final class PruneContentChangesJob implements ShouldQueue
{
    use Queueable;

    public function handle(ContentChangeRepository $changes): void
    {
        $configured = config('content.changes_retention_days');
        $days = is_int($configured) && $configured > 0 ? $configured : 30;

        $changes->deleteCreatedBefore(CarbonImmutable::now('UTC')->subDays($days));
    }
}
