<?php

declare(strict_types=1);

namespace App\Domains\Sync;

use App\Domains\Sync\Console\RefreshStoreVersionsCommand;
use App\Domains\Sync\Repositories\Cache\CacheLatestStoreVersionRepository;
use App\Domains\Sync\Repositories\Contracts\DatabaseHealthRepository;
use App\Domains\Sync\Repositories\Contracts\LatestStoreVersionRepository;
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
        LatestStoreVersionRepository::class => CacheLatestStoreVersionRepository::class,
    ];

    public function boot(): void
    {
        $this->commands([
            RefreshStoreVersionsCommand::class,
        ]);

        Route::middleware('api')
            ->prefix('api/v1')
            ->name('v1.')
            ->group(__DIR__.'/routes.php');
    }
}
