<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Repositories\Contracts;

use App\Domains\Mushaf\Records\SvgMushafPlan;

interface SvgMushafRepository
{
    /**
     * Replaces one edition's row, pages and regions. The caller wraps this in a transaction.
     */
    public function replace(SvgMushafPlan $plan): void;
}
