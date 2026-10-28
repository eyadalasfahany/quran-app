<?php

declare(strict_types=1);

namespace App\Domains\Content;

use App\Domains\Content\Console\BuildContentPackCommand;
use App\Domains\Content\Console\SyncContentCommand;
use App\Domains\Content\Events\ResourceContentChanged;
use App\Domains\Content\Listeners\QueuePackBuild;
use App\Domains\Content\Repositories\Contracts\ChapterAudioFileRepository;
use App\Domains\Content\Repositories\Contracts\ContentChangeRepository;
use App\Domains\Content\Repositories\Contracts\ContentPackRepository;
use App\Domains\Content\Repositories\Contracts\MushafPageRepository;
use App\Domains\Content\Repositories\Contracts\MushafRepository;
use App\Domains\Content\Repositories\Contracts\PackSnapshotRepository;
use App\Domains\Content\Repositories\Contracts\RecitationRepository;
use App\Domains\Content\Repositories\Contracts\RecitationTimingRepository;
use App\Domains\Content\Repositories\Contracts\ResourceRepository;
use App\Domains\Content\Repositories\Contracts\SyncRunRepository;
use App\Domains\Content\Repositories\Contracts\SyncStateRepository;
use App\Domains\Content\Repositories\Contracts\TafsirEntryRepository;
use App\Domains\Content\Repositories\Contracts\WordLayoutRepository;
use App\Domains\Content\Repositories\Eloquent\EloquentChapterAudioFileRepository;
use App\Domains\Content\Repositories\Eloquent\EloquentContentChangeRepository;
use App\Domains\Content\Repositories\Eloquent\EloquentContentPackRepository;
use App\Domains\Content\Repositories\Eloquent\EloquentMushafPageRepository;
use App\Domains\Content\Repositories\Eloquent\EloquentMushafRepository;
use App\Domains\Content\Repositories\Eloquent\EloquentPackSnapshotRepository;
use App\Domains\Content\Repositories\Eloquent\EloquentRecitationRepository;
use App\Domains\Content\Repositories\Eloquent\EloquentRecitationTimingRepository;
use App\Domains\Content\Repositories\Eloquent\EloquentResourceRepository;
use App\Domains\Content\Repositories\Eloquent\EloquentSyncRunRepository;
use App\Domains\Content\Repositories\Eloquent\EloquentSyncStateRepository;
use App\Domains\Content\Repositories\Eloquent\EloquentTafsirEntryRepository;
use App\Domains\Content\Repositories\Eloquent\EloquentWordLayoutRepository;
use App\Domains\Content\Sync\GroupHandlers;
use App\Domains\Content\Sync\Handlers\ChapterRecitationsHandler;
use App\Domains\Content\Sync\Handlers\MushafsHandler;
use App\Domains\Content\Sync\Handlers\TafsirsHandler;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

final class ContentServiceProvider extends ServiceProvider
{
    /**
     * @var array<class-string, class-string>
     */
    public array $bindings = [
        ResourceRepository::class => EloquentResourceRepository::class,
        SyncStateRepository::class => EloquentSyncStateRepository::class,
        SyncRunRepository::class => EloquentSyncRunRepository::class,
        ContentChangeRepository::class => EloquentContentChangeRepository::class,
        ContentPackRepository::class => EloquentContentPackRepository::class,
        PackSnapshotRepository::class => EloquentPackSnapshotRepository::class,
        TafsirEntryRepository::class => EloquentTafsirEntryRepository::class,
        MushafRepository::class => EloquentMushafRepository::class,
        MushafPageRepository::class => EloquentMushafPageRepository::class,
        WordLayoutRepository::class => EloquentWordLayoutRepository::class,
        RecitationRepository::class => EloquentRecitationRepository::class,
        ChapterAudioFileRepository::class => EloquentChapterAudioFileRepository::class,
        RecitationTimingRepository::class => EloquentRecitationTimingRepository::class,
    ];

    public function register(): void
    {
        $this->app->singleton(GroupHandlers::class, function (Application $app): GroupHandlers {
            return new GroupHandlers([
                $app->make(TafsirsHandler::class),
                $app->make(MushafsHandler::class),
                $app->make(ChapterRecitationsHandler::class),
            ]);
        });
    }

    public function boot(): void
    {
        $this->commands([
            SyncContentCommand::class,
            BuildContentPackCommand::class,
        ]);

        Event::listen(ResourceContentChanged::class, QueuePackBuild::class);

        RateLimiter::for('content', function (Request $request): Limit {
            $configured = config('content.rate_limit_per_minute');
            $perMinute = is_int($configured) && $configured > 0 ? $configured : 300;

            return Limit::perMinute($perMinute)->by($request->ip() ?? 'unknown');
        });

        Route::middleware('api')
            ->prefix('api/v1')
            ->name('v1.')
            ->group(__DIR__.'/routes.php');
    }
}
