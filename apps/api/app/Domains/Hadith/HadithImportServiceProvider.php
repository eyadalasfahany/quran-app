<?php

declare(strict_types=1);

namespace App\Domains\Hadith;

use App\Domains\Hadith\Console\BuildGapsCommand;
use App\Domains\Hadith\Console\ExplanationsSnapshotCommand;
use App\Domains\Hadith\Console\ImportExplanationsCommand;
use App\Domains\Hadith\Console\ImportHadithCommand;
use App\Domains\Hadith\Console\MapExplanationsCommand;
use App\Domains\Hadith\Console\MatchBookTitlesCommand;
use App\Domains\Hadith\Console\MatchChaptersCommand;
use App\Domains\Hadith\Console\MatchSectionTitlesCommand;
use App\Domains\Hadith\Repositories\Contracts\HadithExplanationRepository;
use App\Domains\Hadith\Repositories\Contracts\HadithImportRepository;
use App\Domains\Hadith\Repositories\Eloquent\EloquentHadithExplanationRepository;
use App\Domains\Hadith\Repositories\Eloquent\EloquentHadithImportRepository;
use Illuminate\Support\ServiceProvider;

/**
 * Binds the Hadith import repository and registers hadith:import and the dev-only hadith:match-section-titles (step 6).
 * Neither command is scheduled.
 */
final class HadithImportServiceProvider extends ServiceProvider
{
    /**
     * @var array<class-string, class-string>
     */
    public array $bindings = [
        HadithImportRepository::class => EloquentHadithImportRepository::class,
        HadithExplanationRepository::class => EloquentHadithExplanationRepository::class,
    ];

    public function boot(): void
    {
        $this->commands([
            ImportHadithCommand::class,
            MatchSectionTitlesCommand::class,
            BuildGapsCommand::class,
            MatchChaptersCommand::class,
            MatchBookTitlesCommand::class,
            ExplanationsSnapshotCommand::class,
            MapExplanationsCommand::class,
            ImportExplanationsCommand::class,
        ]);
    }
}
