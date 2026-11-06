<?php

declare(strict_types=1);

namespace App\Domains\Content\Jobs;

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Services\ContentSyncService;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

final class SyncQuranFoundationJob implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    /** A full QF sync can run for minutes; the worker's 60 s default would kill it (ADR 0065). */
    public int $timeout = 1800;

    /** Releases the unique lock if a run is killed (a deploy's SIGKILL), so the next day's run is not skipped. */
    public int $uniqueFor = 7200;

    public function __construct(
        public readonly ResourceGroup $group,
        public readonly string $filter,
    ) {
        $this->onQueue('sync');
    }

    public function uniqueId(): string
    {
        return $this->group->value;
    }

    public function handle(ContentSyncService $sync): void
    {
        $sync->run($this->group, $this->filter);
    }
}
