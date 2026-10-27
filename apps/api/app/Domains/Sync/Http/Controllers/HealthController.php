<?php

declare(strict_types=1);

namespace App\Domains\Sync\Http\Controllers;

use App\Domains\Sync\Data\HealthData;
use App\Domains\Sync\Services\HealthService;
use App\Http\Controllers\Controller;

final class HealthController extends Controller
{
    public function __construct(private readonly HealthService $health) {}

    /**
     * API, database and Redis reachability. 200 when all pass, 503 otherwise.
     */
    public function __invoke(): HealthData
    {
        return $this->health->check();
    }
}
