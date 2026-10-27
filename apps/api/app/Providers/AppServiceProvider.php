<?php

declare(strict_types=1);

namespace App\Providers;

use Dedoc\Scramble\Scramble;
use Dedoc\Scramble\Support\Generator\OpenApi;
use Dedoc\Scramble\Support\Generator\Server;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureOpenApi();
    }

    /**
     * The server is relative: built from APP_URL, the exported file would differ per
     * environment and fail the drift check.
     */
    private function configureOpenApi(): void
    {
        Scramble::afterOpenApiGenerated(function (OpenApi $openApi): void {
            $openApi->servers = [new Server('/api/v1')];
        });
    }
}
