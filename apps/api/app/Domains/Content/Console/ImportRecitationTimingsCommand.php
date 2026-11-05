<?php

declare(strict_types=1);

namespace App\Domains\Content\Console;

use App\Domains\Content\Enums\TaybahTimingKind;
use App\Domains\Content\Services\TaybahTimingImporter;
use Illuminate\Console\Command;

/**
 * Imports the committed Taybah timing files (ADR 0060). Runs at web start (start-web.sh) with --defer-pack, which writes
 * the rows and bumps the versions but leaves the pack build to the container start (ADR 0044).
 */
final class ImportRecitationTimingsCommand extends Command
{
    protected $signature = 'recitation-timings:import
        {--defer-pack : Write rows and bump versions, but queue no pack build (start-web.sh builds it, ADR 0044)}
        {--dry-run : Validate and report, write nothing}
        {--kind= : Only qf or mp3quran}
        {--key= : Only one recitation key}
        {--path= : Timing folder of kind/key/NNN.json files, absolute or relative to the app root (default quran.recitation_timings.path)}';

    protected $description = 'Import the committed Taybah recitation timing files (ADR 0060).';

    public function handle(TaybahTimingImporter $importer): int
    {
        $kind = null;
        $option = $this->option('kind');

        if (is_string($option) && $option !== '') {
            $kind = TaybahTimingKind::tryFrom($option);

            if (! $kind instanceof TaybahTimingKind) {
                $this->error('Unknown --kind. Use qf or mp3quran.');

                return self::FAILURE;
            }
        }

        $key = $this->option('key');

        $path = $this->option('path');
        $root = is_string($path) && $path !== '' ? $this->absolutePath($path) : null;

        if ($root !== null && ! is_dir($root)) {
            $this->error('The timing folder is missing: '.$root);

            return self::FAILURE;
        }

        $report = $importer->import(
            deferPack: (bool) $this->option('defer-pack'),
            dryRun: (bool) $this->option('dry-run'),
            kind: $kind,
            recitationKey: is_string($key) && $key !== '' ? $key : null,
            root: $root,
        );

        if ($report->filesSeen === 0) {
            $this->line('No timing files found.');

            return self::SUCCESS;
        }

        $this->table(['Metric', 'Value'], [
            ['files seen', $report->filesSeen],
            ['imported', $report->imported],
            ['unchanged', $report->unchanged],
            ['version bumps', $report->versionBumps],
            ['verses with segments nulled', $report->segmentsNulled],
            ['skipped', count($report->skipped)],
        ]);

        if ($this->option('dry-run')) {
            $this->line('Dry run: nothing written.');
        }

        foreach ($report->skipped as $skipped) {
            $this->line($skipped['path'].': '.$skipped['reason']);
        }

        return $report->hasProblems() ? self::FAILURE : self::SUCCESS;
    }

    private function absolutePath(string $path): string
    {
        return str_starts_with($path, '/') ? $path : base_path($path);
    }
}
