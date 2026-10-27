<?php

declare(strict_types=1);

namespace App\Domains\Sync\Data;

use App\Domains\Sync\Enums\HealthStatus;
use Carbon\CarbonImmutable;
use Spatie\LaravelData\Data;

final class HealthData extends Data
{
    public function __construct(
        public readonly HealthStatus $status,
        public readonly CarbonImmutable $time,
        public readonly HealthChecksData $checks,
    ) {}
}
