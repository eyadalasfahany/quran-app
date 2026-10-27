<?php

declare(strict_types=1);

namespace App\Domains\Sync\Repositories\Contracts;

interface RedisHealthRepository
{
    public function isReachable(): bool;
}
