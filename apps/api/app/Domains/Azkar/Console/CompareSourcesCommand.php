<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Console;

use App\Domains\Azkar\Exceptions\CatalogueUnreadableException;
use App\Domains\Azkar\Services\SourceComparer;
use App\Domains\Azkar\Sources\AzkarSourceRegistry;
use App\Support\Storage\SourceCache;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

/**
 * Compares OpenDua and hisnmuslim.com by book number (ADR 0031 §12). Prints counts. The JSON report holds numbers,
 * statuses, code point positions and lengths: never any text.
 */
final class CompareSourcesCommand extends Command
{
    protected $signature = 'azkar:compare-sources
        {--opendua= : The OpenDua catalogue file (default: the verified download in storage/app/azkar)}
        {--hisnmuslim= : The hisnmuslim snapshot directory (default: the pinned snapshot)}
        {--report= : Where to write the JSON report (default storage/app/azkar/reports/compare-<timestamp>.json)}';

    protected $description = 'Compare OpenDua and hisnmuslim.com by book number: identical, normalised, different, REPEAT (ADR 0031 §12).';

    public function handle(AzkarSourceRegistry $sources, SourceComparer $comparer): int
    {
        $openDuaPath = $this->option('opendua');
        $openDuaPath = is_string($openDuaPath) && $openDuaPath !== '' ? $openDuaPath : SourceCache::path('azkar/catalogue-'.config('azkar.opendua.version').'.json');
        $hisnPath = $this->option('hisnmuslim');
        $hisnPath = is_string($hisnPath) && $hisnPath !== '' ? $hisnPath : SourceCache::path('azkar/hisnmuslim/'.(string) config('azkar.hisnmuslim.snapshot_date'));

        try {
            $openDua = $sources->for('opendua')->parse($openDuaPath);
            $hisn = $sources->for('hisnmuslim')->parse($hisnPath);
        } catch (CatalogueUnreadableException $exception) {
            $this->error($exception->getMessage().' Download the catalogue or take the snapshot first, or pass --opendua= / --hisnmuslim=.');

            return self::FAILURE;
        }

        $result = $comparer->compare($openDua->data, $hisn->data);
        $summary = $result['summary'];

        $this->table(['Metric', 'Value'], collect($summary)->map(fn (int $value, string $key): array => [$key, $value])->values()->all());

        $report = $this->reportPath();
        File::ensureDirectoryExists(dirname($report));
        File::put($report, json_encode([
            'generated_at' => CarbonImmutable::now('UTC')->toIso8601ZuluString(),
            'summary' => $summary,
            'differing' => $result['differing'],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));

        $this->line('Report written to: '.$report.' (numbers, statuses, positions and lengths only)');

        return self::SUCCESS;
    }

    private function reportPath(): string
    {
        $option = $this->option('report');

        if (is_string($option) && $option !== '') {
            return $option;
        }

        return storage_path('app/azkar/reports/compare-'.CarbonImmutable::now('UTC')->format('Ymd-His-v').'.json');
    }
}
