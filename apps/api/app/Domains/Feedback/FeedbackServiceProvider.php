<?php

declare(strict_types=1);

namespace App\Domains\Feedback;

use App\Domains\Feedback\Models\Suggestion;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

/**
 * Registers the website suggestion endpoint, its per-IP limiter and the nightly prune (ADR 0066).
 */
final class FeedbackServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        RateLimiter::for('suggestions', function (Request $request): array {
            $ip = $request->ip() ?? 'unknown';

            return [
                Limit::perHour((int) config('feedback.limits.per_ip_hour', 5))->by('h:'.$ip),
                Limit::perDay((int) config('feedback.limits.per_ip_day', 20))->by('d:'.$ip),
            ];
        });

        Route::middleware('api')
            ->prefix('api/v1')
            ->name('v1.')
            ->group(__DIR__.'/routes.php');

        $this->callAfterResolving(Schedule::class, function (Schedule $schedule): void {
            $schedule->command('model:prune', ['--model' => [Suggestion::class]])->daily()->onOneServer();
        });
    }
}
