<?php

declare(strict_types=1);

namespace App\Domains\Azkar;

use App\Domains\Azkar\Contracts\HadithReferenceSource;
use App\Domains\Azkar\Sources\DorarHadithReferenceSource;
use App\Domains\Azkar\Sources\NullHadithReferenceSource;
use App\Integrations\Dorar\DorarConfig;
use App\Integrations\Dorar\DorarResponseMapper;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

/**
 * Chooses the hadith reference source (ADR 0031 §2). Dorar is wired only when it is configured and enabled.
 * Also registers the Azkar audio route and its own limiter (ADR 0040, spec §8).
 */
final class AzkarServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(HadithReferenceSource::class, function (): HadithReferenceSource {
            if (! $this->app->make(DorarConfig::class)->isAvailable()) {
                return new NullHadithReferenceSource;
            }

            return new DorarHadithReferenceSource(new DorarResponseMapper);
        });
    }

    public function boot(): void
    {
        RateLimiter::for('azkar-audio', function (Request $request): Limit {
            $configured = config('azkar.audio.rate_limit_per_minute');
            $perMinute = is_int($configured) && $configured > 0 ? $configured : 600;

            return Limit::perMinute($perMinute)->by($request->ip() ?? 'unknown');
        });

        Route::middleware('api')
            ->prefix('api/v1')
            ->name('v1.')
            ->group(__DIR__.'/routes.php');
    }
}
