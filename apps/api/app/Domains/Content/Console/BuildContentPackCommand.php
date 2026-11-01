<?php

declare(strict_types=1);

namespace App\Domains\Content\Console;

use App\Domains\Content\Packs\PackBuilder;
use App\Domains\Content\Packs\PackBuildException;
use App\Domains\Content\Repositories\Contracts\ResourceRepository;
use Illuminate\Console\Command;

final class BuildContentPackCommand extends Command
{
    protected $signature = 'content:build-pack {resource_id}';

    protected $description = 'Build the gzipped SQLite pack for a resource\'s current version.';

    public function handle(PackBuilder $packs, ResourceRepository $resources): int
    {
        $argument = (string) $this->argument('resource_id');

        if (preg_match('/^[1-9][0-9]*$/', $argument) !== 1) {
            $this->error('Resource id must be a positive integer.');

            return self::FAILURE;
        }

        $resource = $resources->find((int) $argument);

        if ($resource === null) {
            $this->error('Resource not found.');

            return self::FAILURE;
        }

        try {
            $pack = $packs->build($resource);
        } catch (PackBuildException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->line('version: '.$pack->version);
        $this->line('sha256: '.$pack->sha256);
        $this->line('size_bytes: '.$pack->sizeBytes);
        $this->line('row_count: '.$pack->rowCount);

        return self::SUCCESS;
    }
}
