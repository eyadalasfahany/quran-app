<?php

declare(strict_types=1);

namespace App\Domains\Content\Listeners;

use App\Domains\Content\Events\ResourceContentChanged;
use App\Domains\Content\Jobs\BuildContentPackJob;

final class QueuePackBuild
{
    public function handle(ResourceContentChanged $event): void
    {
        BuildContentPackJob::dispatch($event->resourceId);
    }
}
