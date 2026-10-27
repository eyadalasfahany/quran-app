<?php

declare(strict_types=1);

namespace App\Domains\Sync;

use App\Domains\Sync\Repositories\Contracts\DatabaseHealthRepository;
use App\Domains\Sync\Repositories\Contracts\RedisHealthRepository;
use App\Domains\Sync\Repositories\Eloquent\EloquentDatabaseHealthRepository;
use App\Domains\Sync\Repositories\Predis\PredisRedisHealthRepository;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

final class SyncServiceProvider extends ServiceProvider
{
    /**
     * @var array<class-string, class-string>
     */
    public array $bindings = [
        DatabaseHealthRepository::class => EloquentDatabaseHealthRepository::class,
        RedisHealthRepository::class => PredisRedisHealthRepository::class,
    ];

    public function boot(): void
    {
        Route::middleware('api')
            ->prefix('api/v1')
            ->name('v1.')
            ->group(__DIR__.'/routes.php');
    }
}
