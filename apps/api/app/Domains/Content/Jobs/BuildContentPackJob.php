<?php

declare(strict_types=1);

namespace App\Domains\Content\Jobs;

use App\Domains\Content\Packs\PackBuilder;
use App\Domains\Content\Repositories\Contracts\ResourceRepository;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

final class BuildContentPackJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    /** Tafsir and reciter packs take longer than the worker's 60 s default (ADR 0065). */
    public int $timeout = 600;

    public function __construct(public readonly int $resourceId)
    {
        $this->onQueue('packs');
    }

    public function handle(PackBuilder $packs, ResourceRepository $resources): void
    {
        $resource = $resources->find($this->resourceId);

        if ($resource === null) {
            return;
        }

        $packs->build($resource);
    }
}
