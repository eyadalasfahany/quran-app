<?php

declare(strict_types=1);

namespace App\Domains\Sync\Http\Controllers;

use App\Domains\Sync\Http\Resources\HealthResource;
use App\Domains\Sync\Services\HealthService;
use App\Http\Controllers\Controller;
use Dedoc\Scramble\Attributes\Response;

final class HealthController extends Controller
{
    public function __construct(private readonly HealthService $health) {}

    /**
     * API, database and Redis reachability. 200 when all pass, 503 otherwise.
     */
    #[Response(503, 'The database or Redis is unreachable.', type: 'HealthResource')]
    public function __invoke(): HealthResource
    {
        return new HealthResource($this->health->check());
    }
}
