<?php

declare(strict_types=1);

use App\Domains\Sync\Repositories\Contracts\DatabaseHealthRepository;
use App\Domains\Sync\Repositories\Contracts\RedisHealthRepository;
use Carbon\CarbonImmutable;
use Mockery\MockInterface;

function fakeHealthChecks(bool $database, bool $redis): void
{
    test()->mock(DatabaseHealthRepository::class, fn (MockInterface $mock) => $mock->shouldReceive('isReachable')->andReturn($database));
    test()->mock(RedisHealthRepository::class, fn (MockInterface $mock) => $mock->shouldReceive('isReachable')->andReturn($redis));
}

beforeEach(function (): void {
    $this->travelTo(CarbonImmutable::parse('2026-10-27T09:30:00.123Z'));
});

it('reports ok when the database and redis answer', function (): void {
    fakeHealthChecks(database: true, redis: true);

    $response = $this->getJson('/api/v1/health');

    $response->assertOk()->assertExactJson([
        'status' => 'ok',
        'time' => '2026-10-27T09:30:00.123Z',
        'checks' => ['database' => true, 'redis' => true],
    ]);
    expect($response->headers->get('Cache-Control'))->toContain('no-store');
});

it('is never cached, even when unavailable', function (): void {
    fakeHealthChecks(database: false, redis: true);

    $response = $this->getJson('/api/v1/health');

    $response->assertServiceUnavailable();
    expect($response->headers->get('Cache-Control'))->toContain('no-store');
});

it('reports unavailable with 503 when a dependency is down', function (bool $database, bool $redis): void {
    fakeHealthChecks($database, $redis);

    $this->getJson('/api/v1/health')
        ->assertServiceUnavailable()
        ->assertJsonPath('status', 'unavailable')
        ->assertJsonPath('checks', ['database' => $database, 'redis' => $redis]);
})->with([
    'database down' => [false, true],
    'redis down' => [true, false],
    'both down' => [false, false],
]);
