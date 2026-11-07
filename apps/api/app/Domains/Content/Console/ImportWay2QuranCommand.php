<?php

declare(strict_types=1);

namespace App\Domains\Content\Console;

use App\Domains\Content\Mp3Quran\Mp3QuranManifest;
use App\Domains\Content\Mp3Quran\Mp3QuranManifestException;
use App\Domains\Content\Mp3Quran\ReciterSource;
use App\Domains\Content\Repositories\Contracts\ChapterAudioFileRepository;
use App\Domains\Content\Repositories\Contracts\RecitationRepository;
use App\Domains\Content\Repositories\Contracts\RecitationTimingRepository;
use App\Domains\Content\Repositories\Contracts\ResourceRepository;
use App\Domains\Content\Services\Mp3QuranImporter;
use App\Domains\Content\Services\RecitationSegmentsFlagService;
use App\Domains\Content\Services\ResourceVersionService;
use Illuminate\Console\Command;

/**
 * Imports the committed Way2Quran manifest (ADR 0074). Uses the same importer as MP3Quran, built with the way2quran
 * source profile: the manifest parser and the importer must both carry it, or a mismatch would check the wrong source.
 * A reciter is imported hidden (reason held) until its id is in quran.way2quran_released_reciters.
 *
 * Runs with --defer-pack in the same way as mp3quran:import (ADR 0044). start-web.sh calls it after the MP3Quran import, only when the manifest exists.
 */
final class ImportWay2QuranCommand extends Command
{
    protected $signature = 'way2quran:import
        {--defer-pack : Write rows and bump versions, but queue no pack build (ADR 0044)}
        {--dry-run : Validate and report, write nothing}
        {--manifest= : Manifest file to import, absolute or relative to the app root (default quran.way2quran_manifest_path)}';

    protected $description = 'Import the committed Way2Quran manifest into the chapter recitation tables (ADR 0074).';

    public function handle(
        ResourceRepository $resources,
        RecitationRepository $recitations,
        ChapterAudioFileRepository $files,
        RecitationTimingRepository $timings,
        ResourceVersionService $versions,
        RecitationSegmentsFlagService $flags,
    ): int {
        $source = ReciterSource::way2quran();
        $importer = new Mp3QuranImporter(
            new Mp3QuranManifest($source),
            $resources,
            $recitations,
            $files,
            $timings,
            $versions,
            $flags,
            $source,
        );

        $manifest = $this->option('manifest');
        $manifestPath = is_string($manifest) && $manifest !== '' ? $this->absolutePath($manifest) : null;
        $effectivePath = $manifestPath ?? (string) config($source->manifestPathConfig);

        if (! is_file($effectivePath)) {
            $this->error('The Way2Quran manifest is missing: '.$effectivePath);

            return self::FAILURE;
        }

        try {
            $report = $importer->import(
                deferPack: (bool) $this->option('defer-pack'),
                dryRun: (bool) $this->option('dry-run'),
                manifestPath: $manifestPath,
            );
        } catch (Mp3QuranManifestException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->table(['Metric', 'Value'], [
            ['created', $report->created],
            ['updated', $report->updated],
            ['unchanged', $report->unchanged],
            ['hidden (not released)', $report->hidden],
            ['deactivated', $report->deactivated],
            ['files', $report->files],
            ['surahs listed without a file', $report->surahsWithoutFile],
            ['skipped', count($report->skipped)],
        ]);

        if ($this->option('dry-run')) {
            $this->line('Dry run: nothing written.');
        }

        foreach ($report->skipped as $skipped) {
            $this->line('reciter '.($skipped['moshaf_id'] ?? 'unknown').': '.$skipped['reason']);
        }

        return $report->hasProblems() ? self::FAILURE : self::SUCCESS;
    }

    private function absolutePath(string $path): string
    {
        return str_starts_with($path, '/') ? $path : base_path($path);
    }
}
