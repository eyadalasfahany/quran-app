<?php

declare(strict_types=1);

namespace App\Domains\Content\Data;

use Spatie\LaravelData\Data;

final class SyncRunResult extends Data
{
    public function __construct(
        public readonly int $mutationsApplied,
        public readonly int $resourcesTouched,
        public readonly int $rows,
    ) {}
}
