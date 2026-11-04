<?php

declare(strict_types=1);

namespace App\Domains\Names\Console;

use App\Domains\Names\Data\ImportReport;
use App\Domains\Names\Services\NamesImporter;
use Illuminate\Console\Command;

final class ImportNamesCommand extends Command
{
    protected $signature = 'names:import
        {path? : Reviewed list JSON from apps/api/database/data/names/}
        {--dry-run : Validate only; write no rows}';

    protected $description = 'Import the reviewed 99 Names list (ADR 0043). Refused until content_sources is granted.';

    public function handle(NamesImporter $importer): int
    {
        $pathArg = $this->argument('path');

        $report = $importer->run(
            is_string($pathArg) && $pathArg !== '' ? $pathArg : null,
            (bool) $this->option('dry-run'),
        );

        $this->line('Status: '.$report->status);

        if ($report->content !== []) {
            $encoded = json_encode($report->content, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            if (is_string($encoded)) {
                $this->line($encoded);
            }
        }

        return match ($report->status) {
            ImportReport::STATUS_REFUSED, ImportReport::STATUS_INVALID => self::FAILURE,
            default => self::SUCCESS,
        };
    }
}
