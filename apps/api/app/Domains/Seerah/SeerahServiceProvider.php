<?php

declare(strict_types=1);

namespace App\Domains\Seerah;

use App\Domains\Seerah\Console\ApproveCommand;
use App\Domains\Seerah\Console\CanonicalizeCommand;
use App\Domains\Seerah\Console\FindCommand;
use App\Domains\Seerah\Console\FormatCommand;
use App\Domains\Seerah\Console\PlaceCandidatesCommand;
use App\Domains\Seerah\Console\QuoteCommand;
use App\Domains\Seerah\Console\ReportCommand;
use App\Domains\Seerah\Console\SkeletonCommand;
use App\Domains\Seerah\Console\ValidateCommand;
use Illuminate\Support\ServiceProvider;

/**
 * Registers the Seerah developer commands (ADR 0089). Nothing here is scheduled or wired into a web start.
 */
final class SeerahServiceProvider extends ServiceProvider
{
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
        ]);
    }
}
