<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Console;

use App\Domains\Azkar\Data\ImportReport;
use App\Domains\Azkar\Services\AzkarImporter;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

/**
 * Imports the pinned OpenDua catalogue (ADR 0031). A dry run validates and transforms in memory and writes no rows.
 * A wet import is refused, and writes nothing, until the locks in config/azkar.php are open.
 */
final class ImportAzkarCommand extends Command
{
    protected $signature = 'azkar:import
        {path : The pinned OpenDua catalogue file}
        {--dry-run : Validate and transform in memory; write no rows}
        {--report= : Where to write the JSON report (default storage/app/azkar/reports/<timestamp>.json)}';

    protected $description = 'Import the pinned OpenDua catalogue into the Azkar content tables (ADR 0031).';

    public function handle(AzkarImporter $importer): int
    {
        $path = (string) $this->argument('path');
        $report = $importer->run($path, (bool) $this->option('dry-run'));

        if ($report->status === ImportReport::STATUS_LOCKED) {
            $this->error('The wet import is locked and nothing was written:');

            foreach ($report->lockReasons as $reason) {
                $this->line(' - '.$reason);
            }

            return self::FAILURE;
        }

        $reportPath = $this->reportPath();
        File::ensureDirectoryExists(dirname($reportPath));
        File::put($reportPath, json_encode($report->toReport(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));

        $this->printSummary($report);
        $this->line('Report written to: '.$reportPath);

        return $report->succeeded() ? self::SUCCESS : self::FAILURE;
    }

    private function printSummary(ImportReport $report): void
    {
        $content = $report->content;
        $items = is_array($content['items'] ?? null) ? $content['items'] : [];
        $segments = is_array($content['segments'] ?? null) ? $content['segments'] : [];
        $quran = is_array($content['quran_passages'] ?? null) ? $content['quran_passages'] : [];
        $sourced = $report->sourced;
        $gated = $report->gated;
        $recordings = is_array($gated['recordings'] ?? null) ? $gated['recordings'] : [];
        $english = is_array($gated['english'] ?? null) ? $gated['english'] : [];
        $changed = $report->changedUpstreamTexts;

        $this->line('Status: '.$report->status.($report->dryRun ? ' (dry run)' : ''));
        $this->table(['Metric', 'Value'], [
            ['entries imported', $content['entries_imported'] ?? 0],
            ['entries blocked by errors', $content['entries_blocked'] ?? 0],
            ['chapters imported', $content['chapters_imported'] ?? 0],
            ['items: recitation', $items['recitation'] ?? 0],
            ['items: instruction', $items['instruction'] ?? 0],
            ['items: narration', $items['narration'] ?? 0],
            ['segments: text', $segments['text'] ?? 0],
            ['segments: quran', $segments['quran'] ?? 0],
            ['quran passages mapped', $quran['mapped'] ?? 0],
            ['quran passages unmapped', $quran['unmapped'] ?? 0],
            ['items with required_count', $sourced['items_with_required_count'] ?? 0],
            ['items without required_count', $sourced['items_without_required_count'] ?? 0],
            ['english stored', $english['stored'] ?? 0],
            ['english skipped', $english['skipped'] ?? 0],
            ['recordings upstream', $recordings['upstream'] ?? 0],
            ['recordings imported', $recordings['imported'] ?? 0],
            ['recordings legally downloadable', $recordings['legally_downloadable'] ?? 0],
            ['changed upstream texts', $changed['count'] ?? 0],
            ['errors', count($report->errors())],
            ['warnings', count($report->warnings())],
        ]);

        $counts = [];

        foreach ($report->issues as $issue) {
            $key = $issue['severity'].' '.$issue['code'];
            $counts[$key] = ($counts[$key] ?? 0) + 1;
        }

        foreach ($counts as $key => $count) {
            $this->line(sprintf('  %s: %d', $key, $count));
        }
    }

    private function reportPath(): string
    {
        $option = $this->option('report');

        if (is_string($option) && $option !== '') {
            return $option;
        }

        return storage_path('app/azkar/reports/'.CarbonImmutable::now('UTC')->format('Ymd-His-v').'.json');
    }
}
