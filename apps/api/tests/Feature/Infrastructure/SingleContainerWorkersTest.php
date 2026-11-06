<?php

declare(strict_types=1);

use App\Domains\Content\Jobs\SyncQuranFoundationJob;
use Illuminate\Console\Scheduling\Schedule;

it('runs every scheduled event on one server', function (): void {
    $events = collect(app(Schedule::class)->events());

    expect($events)->not->toBeEmpty();

    $events->each(function (object $event): void {
        expect($event->onOneServer)->toBeTrue();
    });
});

it('has Horizon listen on every queue a job uses', function (): void {
    expect(config('horizon.defaults.supervisor-1.queue'))->toContain('sync', 'packs', 'default');
});

it('keeps the redis retry_after above the longest job timeout', function (): void {
    $timeout = (new ReflectionClass(SyncQuranFoundationJob::class))->getProperty('timeout')->getDefaultValue();

    expect(config('queue.connections.redis.retry_after'))->toBeGreaterThan($timeout);
});
