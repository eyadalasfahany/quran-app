<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Console;

use App\Domains\Hadith\Exceptions\HadithDataFileException;
use App\Domains\Hadith\Exceptions\HadithGapBuildException;
use App\Domains\Hadith\Overlay\HadithDataFiles;
use App\Domains\Hadith\Services\HadithGapBuilder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

/**
 * Dev only (ADR 0076, step 6b.6): builds the gap proposals of the committed decisions from the pinned OpenITI files and, where a
 * decision needs it, hadithapi.com. Writes only under storage/app/hadith/proposals/gaps. Refused in production before any key
 * or file is read. The developer commits the proposal in step 6b.8.
 */
final class BuildGapsCommand extends Command
{
    protected $signature = 'hadith:build-gaps
        {--collection=* : Canonical slug to build (repeatable; default every slug with a committed decisions file)}
        {--openiti-dir= : Folder that holds the pinned OpenITI files (default config hadith.openiti.dir under storage/)}
        {--retrieved-on= : YYYY-MM-DD of the hadithapi.com run; required when a hadithapi.com row is written}';

    protected $description = 'Dev only: build the gap proposals from the decisions file, the pinned OpenITI files and hadithapi.com. Writes under storage/app, never config/ or database/.';

    public function handle(HadithGapBuilder $builder, HadithDataFiles $dataFiles): int
    {
        if (app()->isProduction()) {
            $this->error('hadith:build-gaps is a developer tool and is disabled in production.');

            return self::FAILURE;
        }

        $openitiDir = $this->option('openiti-dir');
        $openitiDir = is_string($openitiDir) && $openitiDir !== '' ? $openitiDir : storage_path((string) config('hadith.openiti.dir'));

        $retrievedOn = $this->option('retrieved-on');
        $retrievedOn = is_string($retrievedOn) && $retrievedOn !== '' ? $retrievedOn : null;
        $known = array_map('strval', (array) config('hadith.collections'));
        $requested = array_values(array_unique(array_map('strval', (array) $this->option('collection'))));
        $slugs = $requested === [] ? array_values(array_filter($known, static fn (string $slug): bool => $dataFiles->actualSha256('gaps/decisions/'.$slug.'.json') !== null)) : $requested;

        foreach ($slugs as $slug) {
            if (! in_array($slug, $known, true)) {
                $this->error('Unknown collection ['.$slug.']. Use one of: '.implode(', ', $known).'.');

                return self::FAILURE;
            }
        }

        $directory = storage_path('app/hadith/proposals/gaps');
        File::ensureDirectoryExists($directory);

        foreach ($slugs as $slug) {
            try {
                $result = $builder->build($slug, $openitiDir, $retrievedOn);
            } catch (HadithGapBuildException|HadithDataFileException $exception) {
                $this->error('['.$slug.'] '.$exception->getMessage());

                return self::FAILURE;
            }

            File::put($directory.'/'.$slug.'.json', $result->proposalJson);
            File::put($directory.'/'.$slug.'.report.json', json_encode($result->report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)."\n");

            $this->line('['.$slug.'] proposal written; proposal SHA-256 '.$result->report['proposal_sha256'].'; fills '.$result->report['fills']['total'].'; merges '.$result->report['merges']['total'].'; unresolved '.$result->report['unresolved']['total'].'.');
        }

        return self::SUCCESS;
    }
}
