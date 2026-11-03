<?php

declare(strict_types=1);

namespace App\Domains\Duas;

use App\Domains\Duas\Console\ImportDuasCommand;
use App\Domains\Duas\Console\QuranCandidatesCommand;
use App\Domains\Duas\Console\SnapshotCommand;
use App\Domains\Duas\Repositories\Contracts\DuasImportRepository;
use App\Domains\Duas\Repositories\Eloquent\EloquentDuasImportRepository;
use Illuminate\Support\ServiceProvider;

final class DuasServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(DuasImportRepository::class, EloquentDuasImportRepository::class);
    }

    public function boot(): void
    {
        $this->commands([
            QuranCandidatesCommand::class,
            SnapshotCommand::class,
            ImportDuasCommand::class,
        ]);
    }
}
