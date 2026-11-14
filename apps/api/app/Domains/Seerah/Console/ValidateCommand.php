<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Console;

use App\Domains\Seerah\Exceptions\SeerahCanonicalException;
use App\Domains\Seerah\Services\CanonicalBookBuilder;
use App\Domains\Seerah\Validation\SeerahValidator;
use App\Domains\Seerah\Validation\Severity;
use Illuminate\Console\Command;

/**
 * Validates the Seerah data folder against V1 to V19 (data-format.md). Structure mode is the default and what CI runs: drafts are
 * allowed and uncovered sections are warnings. --release needs every record approved and decided; --complete makes coverage, milestones
 * and counts strict without the release rules (the flag to use as the data lands).
 */
final class ValidateCommand extends Command
{
    protected $signature = 'seerah:validate
        {--structure : Structure mode (the default): drafts allowed, coverage gaps are warnings}
        {--release : Release mode: every record approved, every flag decided, every group signed; implies --complete}
        {--complete : Uncovered sections, missing milestones and missing counts become errors}
        {--data= : The data folder (default database/data/seerah)}
        {--source= : Another source file (tests and dev only): pins and counts are not checked}';

    protected $description = 'Validate the Seerah data against V1 to V19 (ADR 0089, Phase 8 step 4).';

    public function handle(SeerahValidator $validator, CanonicalBookBuilder $builder): int
    {
        if ($this->option('structure') && $this->option('release')) {
            $this->error('Choose one mode: --structure or --release.');

            return self::FAILURE;
        }

        $release = (bool) $this->option('release');
        $complete = $release || (bool) $this->option('complete');
        $directory = (string) ($this->option('data') ?: database_path('data/seerah'));
        $source = $this->option('source');
        $source = is_string($source) && $source !== '' ? $source : null;

        try {
            $build = $builder->build($source);
        } catch (SeerahCanonicalException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $issues = $validator->validate($directory, $build, $release, $complete)->issues;

        foreach ($issues->all() as $issue) {
            $line = sprintf('[%s] %-7s %s: %s', $issue->rule, $issue->severity->value, $issue->where, $issue->message);

            match ($issue->severity) {
                Severity::Error => $this->line('<error>'.$line.'</error>'),
                Severity::Warning => $this->line('<comment>'.$line.'</comment>'),
                Severity::Info => $this->line($line),
            };
        }

        $mode = $release ? 'release' : ($complete ? 'structure, complete' : 'structure');
        $this->line(sprintf(
            'mode: %s; errors: %d, warnings: %d',
            $mode,
            $issues->count(Severity::Error),
            $issues->count(Severity::Warning),
        ));

        if ($issues->hasErrors()) {
            $this->error('seerah:validate failed.');

            return self::FAILURE;
        }

        $this->info('seerah:validate passed.');

        return self::SUCCESS;
    }
}
