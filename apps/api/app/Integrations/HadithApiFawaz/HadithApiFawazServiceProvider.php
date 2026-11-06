<?php

declare(strict_types=1);

namespace App\Integrations\HadithApiFawaz;

use Illuminate\Support\ServiceProvider;

/**
 * Transport bindings only. Closures, not instances, so a test that changes config can forget the singleton and rebuild it.
 */
final class HadithApiFawazServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(HadithApiFawazConfig::class, fn (): HadithApiFawazConfig => HadithApiFawazConfig::fromConfig());

        $this->app->singleton(HadithApiFawazClient::class, fn (): HadithApiFawazClient => new HadithApiFawazClient(
            $this->app->make(HadithApiFawazConfig::class),
        ));
    }
}
