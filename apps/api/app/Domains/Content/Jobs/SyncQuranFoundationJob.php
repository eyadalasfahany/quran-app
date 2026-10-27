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
