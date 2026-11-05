<?php

declare(strict_types=1);

namespace App\Domains\Content\Console;

use App\Domains\Content\Mp3Quran\Mp3QuranManifestException;
use App\Domains\Content\Services\Mp3QuranImporter;
use Illuminate\Console\Command;

/**
 * Imports the committed MP3Quran manifest (ADR 0061). Runs at web start (start-web.sh) with --defer-pack, which writes
 * the rows and bumps the versions but leaves the pack build to the container start (ADR 0044).
 */
final class ImportMp3QuranCommand extends Command
{
    protected $signature = 'mp3quran:import
        {--defer-pack : Write rows and bump versions, but queue no pack build (start-web.sh builds it, ADR 0044)}
        {--dry-run : Validate and report, write nothing}';

    protected $description = 'Import the committed MP3Quran manifest into the chapter recitation tables (ADR 0061).';

    public function handle(Mp3QuranImporter $importer): int
    {
        try {
            $report = $importer->import(
                deferPack: (bool) $this->option('defer-pack'),
                dryRun: (bool) $this->option('dry-run'),
            );
        } catch (Mp3QuranManifestException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->table(['Metric', 'Value'], [
            ['created', $report->created],
            ['updated', $report->updated],
            ['unchanged', $report->unchanged],
            ['hidden duplicates', $report->hidden],
            ['deactivated', $report->deactivated],
            ['files', $report->files],
            ['surahs listed without a file', $report->surahsWithoutFile],
            ['skipped', count($report->skipped)],
        ]);

        if ($this->option('dry-run')) {
            $this->line('Dry run: nothing written.');
        }

        foreach ($report->skipped as $skipped) {
            $this->line('moshaf '.($skipped['moshaf_id'] ?? 'unknown').': '.$skipped['reason']);
        }

        return $report->hasProblems() ? self::FAILURE : self::SUCCESS;
    }
}
