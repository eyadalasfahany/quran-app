<?php

declare(strict_types=1);

namespace App\Domains\Names\Repositories\Contracts;

use App\Domains\Names\Data\NamesImportPlan;

interface NamesImportRepository
{
    public function replaceForResource(int $resourceId, NamesImportPlan $plan): void;
}
