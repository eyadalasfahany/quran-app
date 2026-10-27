<?php

declare(strict_types=1);

namespace App\Domains\Sync\Repositories\Contracts;

interface DatabaseHealthRepository
{
    public function isReachable(): bool;
}
