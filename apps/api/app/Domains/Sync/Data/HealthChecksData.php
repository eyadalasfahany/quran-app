<?php

declare(strict_types=1);

namespace App\Domains\Sync\Data;

use Spatie\LaravelData\Data;

final class HealthChecksData extends Data
{
    public function __construct(
        public readonly bool $database,
        public readonly bool $redis,
    ) {}
}
