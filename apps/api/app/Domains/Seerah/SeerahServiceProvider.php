<?php

declare(strict_types=1);

namespace App\Domains\Seerah;

use App\Domains\Seerah\Console\CanonicalizeCommand;
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
        ]);
    }
}
