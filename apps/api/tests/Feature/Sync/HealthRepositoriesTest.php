<?php

declare(strict_types=1);

use App\Domains\Sync\Repositories\Eloquent\EloquentDatabaseHealthRepository;
use App\Domains\Sync\Repositories\Predis\PredisRedisHealthRepository;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;

// Reachable paths need the compose MySQL and Redis; they are covered once infra exists (Phase 0, step 4).

it('reports the database as unreachable when MySQL refuses the connection', function (): void {
    config(['database.connections.mysql.host' => '127.0.0.1', 'database.connections.mysql.port' => 1]);
    DB::purge('mysql');

    expect(app(EloquentDatabaseHealthRepository::class)->isReachable())->toBeFalse();
});

it('reports redis as unreachable when Redis refuses the connection', function (): void {
    config(['database.redis.default.host' => '127.0.0.1', 'database.redis.default.port' => 1]);
    Redis::purge('default');

    expect(app(PredisRedisHealthRepository::class)->isReachable())->toBeFalse();
});
