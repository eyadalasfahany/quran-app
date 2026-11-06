<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Console;

use App\Domains\Azkar\Data\ImportReport;
use App\Domains\Azkar\OpenDua\CatalogueDownloader;
use App\Domains\Azkar\Services\AzkarImporter;
use App\Domains\Azkar\Sources\AzkarSourceRegistry;
use App\Domains\Content\Packs\PackBuildException;
use App\Support\Storage\SourceCache;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

/**
 * Imports the pinned OpenDua catalogue (ADR 0031). A dry run validates and transforms in memory and writes no rows.
 * A wet import writes nothing when validation fails (the pinned checksums and the reviewed Quran map still apply).
 *
 * --defer-pack (or --no-pack) writes the rows only: the pack is built at container start (docker/start-web.sh, ADR 0040).
 * Validation failures still fail the run.
 */
final class ImportAzkarCommand extends Command
{
    use ResolvesCataloguePath;

    protected $signature = 'azkar:import
        {path? : The pinned OpenDua catalogue file (omit with --download)}
        {--download : Download the pinned catalogue into storage/app/azkar and verify its SHA-256 first}
        {--dry-run : Validate and transform in memory; write no rows}
        {--build-packs : After a successful wet import, build the azkar pack now instead of queueing it}
        {--defer-pack : After a successful wet import, neither build nor queue the azkar pack; the web service builds it at start (ADR 0044)}
        {--no-pack : Alias for --defer-pack}
        {--skip-blocked : Local only: leave out entries with errors and import the rest; the report lists them}
        {--source= : The source to import: opendua or hisnmuslim (default: config azkar.primary_source)}
        {--report= : Where to write the JSON report (default storage/app/azkar/reports/<timestamp>.json)}';

    protected $description = 'Import the pinned OpenDua catalogue into the Azkar content tables (ADR 0031).';

    public function handle(AzkarImporter $importer, CatalogueDownloader $downloader, AzkarSourceRegistry $sources): int
    {
        $deferPack = (bool) $this->option('defer-pack') || (bool) $this->option('no-pack');

        if ($this->option('build-packs') && $deferPack) {
            $this->error('Choose --build-packs or --defer-pack (--no-pack), not both.');

            return self::FAILURE;
        }

        $dryRun = (bool) $this->option('dry-run');
        $requested = $this->option('source');

        try {
            $profile = $sources->for(is_string($requested) && $requested !== '' ? $requested : $sources->primaryCode())->profile();
        } catch (\InvalidArgumentException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        if ($this->option('skip-blocked') && app()->isProduction()) {
            $this->error('Refused: --skip-blocked is local only. Production imports every entry or none (ADR 0031 §11).');

            return self::FAILURE;
        }

        if ($profile->code === 'hisnmuslim' && $this->argument('path') === null && ! $this->option('download')) {
            // The pinned snapshot directory for the configured date (ADR 0031 §12).
            $path = SourceCache::path('azkar/hisnmuslim/'.(string) config('azkar.hisnmuslim.snapshot_date'));
        } elseif ($profile->code === 'hisnmuslim' && $this->option('download')) {
            $this->error('--download is for the OpenDua catalogue only. Take a hisnmuslim snapshot with azkar:snapshot.');

            return self::FAILURE;
        } else {
            $path = $this->resolveCataloguePath($downloader);
        }

        if ($path === null) {
            return self::FAILURE;
        }

        try {
            $report = $importer->run($path, $dryRun, (bool) $this->option('build-packs'), (bool) $this->option('skip-blocked'), $profile->code, deferPack: $deferPack);
        } catch (PackBuildException $exception) {
            $this->error('The import wrote the rows, but the pack build failed: '.$exception->getMessage());

            return self::FAILURE;
        }

        $reportPath = $this->reportPath();
        File::ensureDirectoryExists(dirname($reportPath));
        File::put($reportPath, json_encode($report->toReport(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));

        $this->printSummary($report);

        foreach ($report->content['skipped'] ?? [] as $skipped) {
            $this->line(sprintf('Left out (blocked): %s [%s]', $skipped['entry'], implode(', ', $skipped['codes'])));
        }
        $this->line(sprintf('excluded: %d', count($report->content['excluded'] ?? [])));
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
            ['recordings missing file (left out)', $recordings['missing_file'] ?? 0],
            ['recordings legally downloadable', $recordings['legally_downloadable'] ?? 0],
            ['changed upstream texts', $changed['count'] ?? 0],
            ['errors', count($report->errors())],
            ['warnings', count($report->warnings())],
        ]);

        $secondary = $sourced['required_count_secondary'] ?? null;

        if (is_array($secondary)) {
            $this->line(sprintf(
                'Secondary %s: %s',
                $secondary['code'],
                $secondary['used'] ? 'used for missing counts' : 'not used ('.$secondary['reason'].')',
            ));
        }

        foreach ($sourced['required_count_sources'] ?? [] as $code => $count) {
            $this->line(sprintf('  required_count from %s: %d', $code, $count));
        }

        $this->line(sprintf('  required_count conflicts (primary kept): %d', count($sourced['required_count_conflicts'] ?? [])));
        $this->line(sprintf('  required_count ambiguous (left null): %d', count($sourced['required_count_ambiguous'] ?? [])));

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
