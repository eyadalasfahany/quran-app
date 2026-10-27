<?php

declare(strict_types=1);

use App\Domains\Sync\Repositories\Eloquent\EloquentDatabaseHealthRepository;
use App\Domains\Sync\Repositories\Predis\PredisRedisHealthRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

// Needs the local MySQL and Redis from docs/runbooks/local-setup.md (service containers in CI).

uses(RefreshDatabase::class);

it('reports the database as reachable', function (): void {
    expect(app(EloquentDatabaseHealthRepository::class)->isReachable())->toBeTrue();
});

it('reports redis as reachable', function (): void {
    expect(app(PredisRedisHealthRepository::class)->isReachable())->toBeTrue();
});

it('answers ok end to end', function (): void {
    $this->getJson('/api/v1/health')
        ->assertOk()
        ->assertJsonPath('status', 'ok')
        ->assertJsonPath('checks', ['database' => true, 'redis' => true]);
});
