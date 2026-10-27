<?php

declare(strict_types=1);

namespace App\Domains\Sync\Http\Resources;

use App\Domains\Sync\Data\HealthData;
use App\Domains\Sync\Enums\HealthStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Symfony\Component\HttpFoundation\Response;

/**
 * @property HealthData $resource
 */
final class HealthResource extends JsonResource
{
    public static $wrap = null;

    /**
     * @return array{status: HealthStatus, time: string, checks: array{database: bool, redis: bool}}
     */
    public function toArray(Request $request): array
    {
        return [
            'status' => $this->resource->status,
            /** @format date-time */
            'time' => $this->resource->time->toIso8601ZuluString('millisecond'),
            'checks' => [
                'database' => $this->resource->checks->database,
                'redis' => $this->resource->checks->redis,
            ],
        ];
    }

    public function withResponse(Request $request, JsonResponse $response): void
    {
        if ($this->resource->status !== HealthStatus::Ok) {
            $response->setStatusCode(Response::HTTP_SERVICE_UNAVAILABLE);
        }
    }
}
