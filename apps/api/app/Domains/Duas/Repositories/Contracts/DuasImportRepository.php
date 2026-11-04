<?php

declare(strict_types=1);

namespace App\Domains\Duas\Repositories\Contracts;

use App\Domains\Duas\Data\DuasImportPlan;

interface DuasImportRepository
{
    public function replaceForResource(int $resourceId, DuasImportPlan $plan): void;
}
