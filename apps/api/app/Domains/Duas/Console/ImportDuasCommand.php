<?php

declare(strict_types=1);

namespace App\Domains\Duas\Console;

use App\Domains\Azkar\Data\ImportReport;
use App\Domains\Content\Packs\PackBuildException;
use App\Domains\Duas\Services\DuasImporter;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Support\Facades\File;

final class ImportDuasCommand extends Command
{
    protected $signature = 'duas:import
        {--dry-run : Validate and plan in memory; write no rows}
        {--build-packs : Build the duas pack now instead of queueing it}
        {--defer-pack : Neither build nor queue the pack; the web service builds it at start}
        {--no-pack : Alias for --defer-pack}
        {--download : Reserved for snapshot fetch at release; verifies pin when a snapshot directory exists}
        {--local : Refused when APP_ENV is production}
        {--report= : Where to write the JSON report}';

    protected $description = 'Import Duas content from the reviewed Quran map and optional HadeethEnc snapshot (ADR 0044-duas §6).';

    public function handle(DuasImporter $importer): int
    {
        $deferPack = (bool) $this->option('defer-pack') || (bool) $this->option('no-pack');

        if ($this->option('build-packs') && $deferPack) {
            $this->error('Choose --build-packs or --defer-pack (--no-pack), not both.');

            return self::FAILURE;
        }

        if ($this->option('local') && app()->isProduction()) {
            $this->error('Refused: --local is not allowed when APP_ENV=production.');

            return self::FAILURE;
        }

        try {
            $report = $importer->run(
                dryRun: (bool) $this->option('dry-run'),
                buildPacks: (bool) $this->option('build-packs'),
                deferPack: $deferPack,
            );
        } catch (LockTimeoutException) {
            $this->error('Another Duas import is already running.');

            return self::FAILURE;
        } catch (PackBuildException $exception) {
            $this->error('The import wrote the rows, but the pack build failed: '.$exception->getMessage());

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

        $this->line('Status: '.$report->status.($report->dryRun ? ' (dry run)' : ''));
        $this->table(['Metric', 'Value'], [
            ['quran accepted', $content['quran_accepted'] ?? 0],
            ['quran skipped (rejected)', $content['quran_skipped'] ?? 0],
            ['quran blocked', $content['quran_blocked'] ?? 0],
            ['hadith accepted', $content['hadith_accepted'] ?? 0],
            ['links accepted', $content['links_accepted'] ?? 0],
            ['items total', $content['items_total'] ?? 0],
            ['errors', count($report->errors())],
            ['warnings', count($report->warnings())],
        ]);
    }

    private function reportPath(): string
    {
        $option = $this->option('report');

        if (is_string($option) && $option !== '') {
            return $option;
        }

        return storage_path('app/duas/reports/'.CarbonImmutable::now('UTC')->format('Ymd-His-v').'.json');
    }
}
