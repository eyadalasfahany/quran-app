<?php

declare(strict_types=1);

namespace App\Domains\Content\Events;

use Illuminate\Foundation\Events\Dispatchable;

final class ResourceContentChanged
{
    use Dispatchable;

    public function __construct(
        public readonly int $resourceId,
        public readonly int $version,
    ) {}
}
