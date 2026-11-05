<?php

declare(strict_types=1);

namespace App\Domains\Sync\Http\Controllers;

use App\Domains\Sync\Http\Resources\BootstrapResource;
use App\Domains\Sync\Services\BootstrapService;
use App\Http\Controllers\Controller;

final class BootstrapController extends Controller
{
    public function __construct(private readonly BootstrapService $bootstrap) {}

    /**
     * What the app needs at launch: the minimum app version per platform and the store links.
     */
    public function __invoke(): BootstrapResource
    {
        return new BootstrapResource($this->bootstrap->current());
    }
}
