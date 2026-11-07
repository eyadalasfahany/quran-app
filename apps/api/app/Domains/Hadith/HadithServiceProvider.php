<?php

declare(strict_types=1);

namespace App\Domains\Hadith;

use App\Domains\Hadith\Repositories\Contracts\HadithCatalogueRepository;
use App\Domains\Hadith\Repositories\Eloquent\EloquentHadithCatalogueRepository;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

/**
 * Binds the hadith catalogue repository and registers the public read routes under /api/v1/hadith (ADR 0042).
 */
final class HadithServiceProvider extends ServiceProvider
{
    /**
     * @var array<class-string, class-string>
     */
    public array $bindings = [
        HadithCatalogueRepository::class => EloquentHadithCatalogueRepository::class,
    ];

    public function boot(): void
    {
        Route::middleware('api')
            ->prefix('api/v1')
            ->name('v1.')
            ->group(__DIR__.'/routes.php');
    }
}
