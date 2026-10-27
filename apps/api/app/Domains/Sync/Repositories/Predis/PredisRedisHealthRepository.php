<?php

declare(strict_types=1);

namespace App\Domains\Sync\Repositories\Predis;

use App\Domains\Sync\Repositories\Contracts\RedisHealthRepository;
use Illuminate\Redis\RedisManager;
use Predis\PredisException;

final readonly class PredisRedisHealthRepository implements RedisHealthRepository
{
    public function __construct(private RedisManager $redis) {}

    public function isReachable(): bool
    {
        try {
            $this->redis->connection()->command('ping');

            return true;
        } catch (PredisException) {
            return false;
        }
    }
}
