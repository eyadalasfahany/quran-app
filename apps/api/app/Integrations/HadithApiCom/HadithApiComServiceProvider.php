<?php

declare(strict_types=1);

namespace App\Integrations\HadithApiCom;

use Illuminate\Support\ServiceProvider;

/**
 * Closure bindings, so a test that changes config can forget the singleton and rebuild it. Resolving the config throws in
 * production or without a key, so nothing that needs the client is resolved on those paths.
 */
final class HadithApiComServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(HadithApiComConfig::class, fn (): HadithApiComConfig => HadithApiComConfig::fromConfig());

        $this->app->singleton(HadithApiComClient::class, fn (): HadithApiComClient => new HadithApiComClient(
            $this->app->make(HadithApiComConfig::class),
        ));
    }
}
