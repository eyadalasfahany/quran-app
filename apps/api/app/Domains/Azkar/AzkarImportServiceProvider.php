<?php

declare(strict_types=1);

namespace App\Domains\Azkar;

use App\Domains\Azkar\Console\CompareSourcesCommand;
use App\Domains\Azkar\Console\HadeethEncLinksCommand;
use App\Domains\Azkar\Console\ImportAzkarCommand;
use App\Domains\Azkar\Console\QuranMapCandidatesCommand;
use App\Domains\Azkar\Console\SnapshotCommand;
use App\Domains\Azkar\Console\SourcePermissionCommand;
use App\Domains\Azkar\Repositories\Contracts\AzkarImportRepository;
use App\Domains\Azkar\Repositories\Eloquent\EloquentAzkarImportRepository;
use Illuminate\Support\ServiceProvider;

/**
 * Wires the OpenDua import pipeline (ADR 0031 §1, §3): its repository and its artisan command.
 */
final class AzkarImportServiceProvider extends ServiceProvider
{
    /**
     * @var array<class-string, class-string>
     */
    public array $bindings = [
        AzkarImportRepository::class => EloquentAzkarImportRepository::class,
    ];

    public function boot(): void
    {
        $this->commands([
            ImportAzkarCommand::class,
            QuranMapCandidatesCommand::class,
            SourcePermissionCommand::class,
            SnapshotCommand::class,
            CompareSourcesCommand::class,
            HadeethEncLinksCommand::class,
        ]);
    }
}
