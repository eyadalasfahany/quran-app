<?php

declare(strict_types=1);

namespace App\Integrations\QuranFoundation;

use Illuminate\Contracts\Cache\Repository;
use Illuminate\Support\ServiceProvider;

final class QuranFoundationServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(QfConfig::class, fn (): QfConfig => QfConfig::fromConfig());

        $this->app->singleton(QfHttp::class, fn (): QfHttp => new QfHttp($this->app->make(QfConfig::class)));

        $this->app->singleton(OAuthTokenProvider::class, fn (): OAuthTokenProvider => new OAuthTokenProvider(
            $this->app->make(Repository::class),
            $this->app->make(QfConfig::class),
            $this->app->make(QfHttp::class),
        ));

        $this->app->singleton(ContentSyncClient::class, fn (): ContentSyncClient => new ContentSyncClient(
            $this->app->make(OAuthTokenProvider::class),
            $this->app->make(QfConfig::class),
            $this->app->make(QfHttp::class),
        ));
    }

    public function boot(): void
    {
        $this->commands([
            PingQuranFoundationCommand::class,
        ]);
    }
}
