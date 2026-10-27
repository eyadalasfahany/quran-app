<?php

declare(strict_types=1);

use App\Domains\Sync\Enums\HealthStatus;
use App\Domains\Sync\Repositories\Contracts\DatabaseHealthRepository;
use App\Domains\Sync\Repositories\Contracts\RedisHealthRepository;
use App\Domains\Sync\Services\HealthService;
use Carbon\CarbonImmutable;

function healthService(bool $database, bool $redis): HealthService
{
    $databaseRepository = Mockery::mock(DatabaseHealthRepository::class);
    $databaseRepository->shouldReceive('isReachable')->once()->andReturn($database);

    $redisRepository = Mockery::mock(RedisHealthRepository::class);
    $redisRepository->shouldReceive('isReachable')->once()->andReturn($redis);

    return new HealthService($databaseRepository, $redisRepository);
}

afterEach(function (): void {
    CarbonImmutable::setTestNow();
    Mockery::close();
});

it('is ok only when both checks pass', function (bool $database, bool $redis, HealthStatus $expected): void {
    $report = healthService($database, $redis)->check();

    expect($report->status)->toBe($expected)
        ->and($report->checks->database)->toBe($database)
        ->and($report->checks->redis)->toBe($redis);
})->with([
    'all up' => [true, true, HealthStatus::Ok],
    'database down' => [false, true, HealthStatus::Unavailable],
    'redis down' => [true, false, HealthStatus::Unavailable],
    'both down' => [false, false, HealthStatus::Unavailable],
]);

it('stamps the report with the current UTC time', function (): void {
    CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-10-27T12:30:00.250+03:00'));

    $report = healthService(true, true)->check();

    expect($report->time->getTimezone()->getName())->toBe('UTC')
        ->and($report->time->toIso8601ZuluString('millisecond'))->toBe('2026-10-27T09:30:00.250Z');
});
