<?php

declare(strict_types=1);

namespace App\Domains\Mushaf;

use App\Domains\Mushaf\Console\BuildWordBoxesCommand;
use App\Domains\Mushaf\Console\ImportSvgMushafCommand;
use App\Domains\Mushaf\Console\PublishSvgMushafCommand;
use App\Domains\Mushaf\Console\SetupMushafCommand;
use App\Domains\Mushaf\Repositories\Contracts\SvgMushafPackRepository;
use App\Domains\Mushaf\Repositories\Contracts\SvgMushafRepository;
use App\Domains\Mushaf\Repositories\Contracts\SvgMushafWordBoxRepository;
use App\Domains\Mushaf\Repositories\Eloquent\EloquentSvgMushafPackRepository;
use App\Domains\Mushaf\Repositories\Eloquent\EloquentSvgMushafRepository;
use App\Domains\Mushaf\Repositories\Eloquent\EloquentSvgMushafWordBoxRepository;
use Illuminate\Support\ServiceProvider;

final class MushafServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(SvgMushafRepository::class, EloquentSvgMushafRepository::class);
        $this->app->bind(SvgMushafWordBoxRepository::class, EloquentSvgMushafWordBoxRepository::class);
        $this->app->bind(SvgMushafPackRepository::class, EloquentSvgMushafPackRepository::class);
    }

    public function boot(): void
    {
        $this->commands([
            ImportSvgMushafCommand::class,
            BuildWordBoxesCommand::class,
            PublishSvgMushafCommand::class,
            SetupMushafCommand::class,
        ]);
    }
}
