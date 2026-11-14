<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Console;

use App\Domains\Seerah\Exceptions\SeerahCanonicalException;
use App\Domains\Seerah\Report\ReportContext;
use App\Domains\Seerah\Report\SeerahReport;
use App\Domains\Seerah\Services\CanonicalBookBuilder;
use App\Domains\Seerah\Validation\SeerahValidator;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

/**
 * Developer tool (ADR 0089, Phase 8 step 6): writes the review report to storage/app/seerah-report/index.html (not committed). It runs the
 * structure validation so the report shows the current issues, and it never writes to the data folder.
 */
final class ReportCommand extends Command
{
    protected $signature = 'seerah:report
        {--out= : Where to write the report (default storage/app/seerah-report/index.html)}
        {--data= : The data folder (default database/data/seerah)}
        {--source= : Another source file (tests and dev only)}';

    protected $description = 'Write the Seerah review report as one HTML file (ADR 0089, Phase 8 step 6).';

    public function handle(SeerahValidator $validator, CanonicalBookBuilder $builder, SeerahReport $report): int
    {
        $source = $this->option('source');

        try {
            $build = $builder->build(is_string($source) && $source !== '' ? $source : null);
        } catch (SeerahCanonicalException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $directory = (string) ($this->option('data') ?: database_path('data/seerah'));
        $run = $validator->validate($directory, $build, false, false);
        $batches = [];

        foreach ((array) config('seerah.batches', []) as $name => $batch) {
            if (is_array($batch)) {
                $batches[(string) $name] = [
                    'from' => (string) ($batch['from'] ?? ''),
                    'to' => (string) ($batch['to'] ?? ''),
                    'start_title' => (string) ($batch['start_title'] ?? ''),
                    'period' => (string) ($batch['period'] ?? ''),
                ];
            }
        }

        $target = (string) ($this->option('out') ?: storage_path('app/seerah-report/index.html'));
        File::ensureDirectoryExists(dirname($target));
        File::put($target, $report->render(new ReportContext($run, $build, $batches)));

        $this->info('Report written: '.$target);

        return self::SUCCESS;
    }
}
