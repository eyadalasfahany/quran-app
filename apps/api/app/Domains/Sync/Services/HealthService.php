<?php

declare(strict_types=1);

namespace App\Domains\Sync\Services;

use App\Domains\Sync\Data\HealthChecksData;
use App\Domains\Sync\Data\HealthData;
use App\Domains\Sync\Enums\HealthStatus;
use App\Domains\Sync\Repositories\Contracts\DatabaseHealthRepository;
use App\Domains\Sync\Repositories\Contracts\RedisHealthRepository;
use Carbon\CarbonImmutable;

final readonly class HealthService
{
    public function __construct(
        private DatabaseHealthRepository $database,
        private RedisHealthRepository $redis,
    ) {}

    /**
     * The API is healthy only when both MySQL and Redis answer.
     */
    public function check(): HealthData
    {
        $checks = new HealthChecksData(
            database: $this->database->isReachable(),
            redis: $this->redis->isReachable(),
        );

        return new HealthData(
            status: $checks->database && $checks->redis ? HealthStatus::Ok : HealthStatus::Unavailable,
            time: CarbonImmutable::now('UTC'),
            checks: $checks,
        );
    }
}
