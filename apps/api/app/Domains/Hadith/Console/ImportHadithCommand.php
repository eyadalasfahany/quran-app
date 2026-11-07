<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Console;

use App\Domains\Hadith\Exceptions\HadithDataFileException;
use App\Domains\Hadith\Exceptions\HadithImportLockedException;
use App\Domains\Hadith\Exceptions\HadithPinException;
use App\Domains\Hadith\Exceptions\HadithRangeCorrectionException;
use App\Domains\Hadith\Exceptions\HadithSourceFormatException;
use App\Domains\Hadith\Import\Records\CollectionImportResult;
use App\Domains\Hadith\Import\Records\CollectionStats;
use App\Domains\Hadith\Import\Records\HadithImportReport;
use App\Domains\Hadith\Services\HadithImporter;
use App\Domains\Hadith\Sources\HadithSnapshotter;
use App\Integrations\HadithApiFawaz\HadithApiFawazException;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

/**
 * Imports the pinned fawazahmed0 hadith collections (ADR 0042). A dry run maps and validates in memory. A wet run writes
 * one collection per transaction; a failed collection writes nothing and the others still import. Exit 1 when any failed.
 * Never prints hadith text, titles, section names, grades or an exception message other than the domain messages.
 */
final class ImportHadithCommand extends Command
{
    protected $signature = 'hadith:import
        {--download : Fetch and verify the 12 pinned files first (hadith:snapshot in verified mode); without it no request is made}
        {--dry-run : Map and validate in memory; write no rows}
        {--verify : Check stored rows against the source text; write nothing}
        {--build-packs : After a successful wet import, build each pack now}
        {--defer-pack : Neither build nor queue the pack; the web service builds it at start (ADR 0044)}
        {--no-pack : Alias for --defer-pack}
        {--collection=* : Canonical slug to import (repeatable; default all ten, in config order)}
        {--report= : Where to write the JSON report (default storage/app/hadith/reports/<Ymd-His-v>.json)}';

    protected $description = 'Import the pinned fawazahmed0 hadith collections into the Hadith content tables (ADR 0042).';

    public function handle(HadithImporter $importer, HadithSnapshotter $snapshotter): int
    {
        $deferPack = (bool) $this->option('defer-pack') || (bool) $this->option('no-pack');
        $verify = (bool) $this->option('verify');
        $dryRun = (bool) $this->option('dry-run');
        $buildPacks = (bool) $this->option('build-packs');

        if ($buildPacks && $deferPack) {
            $this->error('Choose --build-packs or --defer-pack (--no-pack), not both.');

            return self::FAILURE;
        }

        if ($verify && ($dryRun || $buildPacks || $deferPack)) {
            $this->error('--verify writes nothing; it cannot be combined with --dry-run, --build-packs, --defer-pack or --no-pack.');

            return self::FAILURE;
        }

        $slugs = $this->selectedSlugs();

        if ($slugs === null) {
            return self::FAILURE;
        }

        if ($this->option('download')) {
            try {
                $results = $snapshotter->take(false);
            } catch (HadithApiFawazException|HadithPinException|HadithSourceFormatException $exception) {
                $this->error($exception->getMessage());

                return self::FAILURE;
            }

            $this->line('Snapshot verified: '.count($results).' files.');
        }

        try {
            $report = $verify
                ? $importer->verify($slugs)
                : $importer->run($slugs, $dryRun, $buildPacks, $deferPack);
        } catch (HadithImportLockedException|HadithRangeCorrectionException|HadithDataFileException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $reportPath = $this->reportPath();
        File::ensureDirectoryExists(dirname($reportPath));
        File::put($reportPath, json_encode($report->toReport(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));

        $this->printSummary($report);
        $this->line('Peak memory: '.number_format($report->peakMemoryBytes / 1048576, 1).' MB');
        $this->line('Report written to: '.$reportPath);

        return $report->succeeded() ? self::SUCCESS : self::FAILURE;
    }

    /**
     * @return list<string>|null Null when a slug is unknown (the error is printed).
     */
    private function selectedSlugs(): ?array
    {
        $valid = array_values(array_map('strval', (array) config('hadith.collections')));
        $requested = array_values(array_unique(array_map('strval', (array) $this->option('collection'))));

        if ($requested === []) {
            return $valid;
        }

        foreach ($requested as $slug) {
            if (! in_array($slug, $valid, true)) {
                $this->error('Unknown collection ['.$slug.']. Use one of: '.implode(', ', $valid).'.');

                return null;
            }
        }

        return $requested;
    }

    private function reportPath(): string
    {
        $given = $this->option('report');

        if (is_string($given) && $given !== '') {
            return $given;
        }

        return storage_path('app/hadith/reports/'.CarbonImmutable::now('UTC')->format('Ymd-His-v').'.json');
    }

    private function printSummary(HadithImportReport $report): void
    {
        $rows = [];

        foreach ($report->collections as $result) {
            $stats = $result->stats ?? new CollectionStats;
            $rows[] = [
                $result->slug,
                $result->status,
                $stats->hadithInFile,
                $stats->imported,
                $stats->noText,
                $stats->booksCreated,
                $stats->grades,
                count($stats->referenceMismatchNumbers),
                count($stats->duplicateNumbers),
                number_format($stats->estimatedRawBytes / 1048576, 2),
            ];
        }

        $this->line('Status'.($report->dryRun ? ' (dry run)' : ($report->verify ? ' (verify)' : '')).':');
        $this->table(['Collection', 'Status', 'In file', 'Imported', 'No text', 'Books', 'Grades', 'Mismatches', 'Duplicates', 'Est. raw MB'], $rows);

        foreach ($report->collections as $result) {
            if ($result->stats === null && $result->complete === null) {
                continue;
            }

            $stats = $result->stats ?? new CollectionStats;
            $complete = $result->complete ?? $stats->complete;
            $incomplete = $result->incompleteCount ?? count($stats->incompleteNumbers);
            $this->line($result->slug.': complete: '.($complete ? 'yes' : 'no ('.$incomplete.' incomplete)'));
        }

        foreach ($report->collections as $result) {
            $this->printProblems($result);
        }
    }

    private function printProblems(CollectionImportResult $result): void
    {
        if ($result->status === CollectionImportResult::STATUS_NO_SNAPSHOT) {
            $this->line($result->slug.': '.$result->failure);
            $this->line('Run hadith:import --download.');

            return;
        }

        if ($result->failure !== null) {
            $this->line($result->slug.': '.$result->failure);
        }

        $counts = [];

        foreach ($result->issues as $issue) {
            if ($issue->severity !== 'error') {
                continue;
            }

            $counts[$issue->code] = ($counts[$issue->code] ?? 0) + 1;
        }

        foreach ($counts as $code => $count) {
            $this->line(sprintf('%s: %s (%d)', $result->slug, $code, $count));
        }
    }
}
