<?php

declare(strict_types=1);

namespace App\Domains\Seerah;

use App\Domains\Seerah\Console\ApproveCommand;
use App\Domains\Seerah\Console\CanonicalizeCommand;
use App\Domains\Seerah\Console\FindCommand;
use App\Domains\Seerah\Console\FormatCommand;
use App\Domains\Seerah\Console\ImportSeerahCommand;
use App\Domains\Seerah\Console\PlaceCandidatesCommand;
use App\Domains\Seerah\Console\QuoteCommand;
use App\Domains\Seerah\Console\ReportCommand;
use App\Domains\Seerah\Console\SkeletonCommand;
use App\Domains\Seerah\Console\ValidateCommand;
use App\Domains\Seerah\Repositories\Contracts\SeerahCatalogueRepository;
use App\Domains\Seerah\Repositories\Contracts\SeerahImportRepository;
use App\Domains\Seerah\Repositories\Eloquent\EloquentSeerahCatalogueRepository;
use App\Domains\Seerah\Repositories\Eloquent\EloquentSeerahImportRepository;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

/**
 * Registers the Seerah developer commands (ADR 0089), the import and the catalogue endpoint (steps 23 and 25). The import is not
 * scheduled or wired into a web start (step 26 is prepared, not run).
 */
final class SeerahServiceProvider extends ServiceProvider
{
    /**
     * @var array<class-string, class-string>
     */
    public array $bindings = [
        SeerahImportRepository::class => EloquentSeerahImportRepository::class,
        SeerahCatalogueRepository::class => EloquentSeerahCatalogueRepository::class,
    ];

    public function boot(): void
    {
        $this->commands([
            CanonicalizeCommand::class,
            FormatCommand::class,
            ValidateCommand::class,
            FindCommand::class,
            QuoteCommand::class,
            SkeletonCommand::class,
            PlaceCandidatesCommand::class,
            ApproveCommand::class,
            ReportCommand::class,
            ImportSeerahCommand::class,
        ]);

        Route::middleware('api')
            ->prefix('api/v1')
            ->name('v1.')
            ->group(__DIR__.'/routes.php');
    }
}
