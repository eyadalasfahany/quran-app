<?php

declare(strict_types=1);

namespace App\Domains\Sync\Data;

use App\Domains\Sync\Enums\HealthStatus;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Spatie\LaravelData\Data;
use Symfony\Component\HttpFoundation\Response;

final class HealthData extends Data
{
    public function __construct(
        public readonly HealthStatus $status,
        public readonly CarbonImmutable $time,
        public readonly HealthChecksData $checks,
    ) {}

    protected function calculateResponseStatus(Request $request): int
    {
        return $this->status === HealthStatus::Ok
            ? Response::HTTP_OK
            : Response::HTTP_SERVICE_UNAVAILABLE;
    }
}
