<?php

declare(strict_types=1);

namespace App\Domains\Names;

use App\Domains\Names\Console\ImportNamesCommand;
use App\Domains\Names\Repositories\Contracts\NamesImportRepository;
use App\Domains\Names\Repositories\Eloquent\EloquentNamesImportRepository;
use Illuminate\Support\ServiceProvider;

final class NamesServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(NamesImportRepository::class, EloquentNamesImportRepository::class);
    }

    public function boot(): void
    {
        $this->commands([
            ImportNamesCommand::class,
        ]);
    }
}
