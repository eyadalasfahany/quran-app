<?php

declare(strict_types=1);

namespace App\Integrations\Dorar;

use Illuminate\Contracts\Cache\Repository;
use Illuminate\Support\ServiceProvider;

/**
 * Transport and config only. The HadithReferenceSource binding lives in the Azkar domain provider.
 */
final class DorarServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(DorarConfig::class, fn (): DorarConfig => DorarConfig::fromConfig());

        $this->app->singleton(DorarClient::class, fn (): DorarClient => new DorarClient(
            $this->app->make(DorarConfig::class),
            $this->app->make(Repository::class),
        ));
    }
}
