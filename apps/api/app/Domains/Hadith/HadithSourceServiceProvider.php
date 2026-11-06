<?php

declare(strict_types=1);

namespace App\Domains\Hadith;

use App\Domains\Hadith\Console\HadithSnapshotCommand;
use App\Domains\Hadith\Contracts\HadithCollectionSource;
use App\Domains\Hadith\Sources\HadithSourceRegistry;
use Illuminate\Support\ServiceProvider;

/**
 * Registers the Hadith source registry, binds the primary source, and registers hadith:snapshot (step 5). Not scheduled.
 */
final class HadithSourceServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(HadithSourceRegistry::class);

        $this->app->bind(HadithCollectionSource::class, fn (): HadithCollectionSource => $this->app->make(HadithSourceRegistry::class)->primary());
    }

    public function boot(): void
    {
        $this->commands([HadithSnapshotCommand::class]);
    }
}
