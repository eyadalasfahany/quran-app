<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Console;

use App\Domains\Azkar\Exceptions\CatalogueDownloadException;
use App\Domains\Azkar\OpenDua\CatalogueDownloader;

/**
 * The catalogue path an Azkar command works on: the path argument, or the verified download. Exactly one of the two.
 */
trait ResolvesCataloguePath
{
    private function resolveCataloguePath(CatalogueDownloader $downloader): ?string
    {
        $argument = $this->argument('path');
        $download = (bool) $this->option('download');

        if ($download && $argument !== null) {
            $this->error('Give a path or --download, not both.');

            return null;
        }

        if (! $download) {
            if (! is_string($argument) || $argument === '') {
                $this->error('Give the catalogue path, or use --download.');

                return null;
            }

            return $argument;
        }

        try {
            $path = $downloader->download();
        } catch (CatalogueDownloadException $exception) {
            $this->error($exception->getMessage());

            return null;
        }

        $this->line('Downloaded and verified the pinned catalogue: '.$path);

        return $path;
    }
}
