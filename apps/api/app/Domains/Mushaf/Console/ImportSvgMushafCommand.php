<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Console;

use App\Domains\Mushaf\Exceptions\SvgMushafException;
use App\Domains\Mushaf\Services\SvgMushafImporter;
use Illuminate\Console\Command;

final class ImportSvgMushafCommand extends Command
{
    protected $signature = 'mushaf:import
        {key : hafs, warsh, qalun, shubah or duri}
        {--offline : use cached files only}';

    protected $description = 'Import a pinned quran-svg mushaf: page SVGs and ayah polygons (ADR 0090).';

    public function handle(SvgMushafImporter $importer): int
    {
        try {
            $report = $importer->import((string) $this->argument('key'), (bool) $this->option('offline'));
        } catch (SvgMushafException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->line(sprintf('Imported [%s]: %d pages, %d ayah regions, %d ayahs.', $report->key, $report->pages, $report->regions, $report->ayahs));
        $this->line(sprintf('Raw SVG: %d bytes. Gzip: %d bytes.', $report->svgBytes, $report->gzipBytes));

        return self::SUCCESS;
    }
}
