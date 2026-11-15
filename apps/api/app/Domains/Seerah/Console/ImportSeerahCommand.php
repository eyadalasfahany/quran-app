<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Console;

use App\Domains\Seerah\Enums\ImportMode;
use App\Domains\Seerah\Exceptions\SeerahCanonicalException;
use App\Domains\Seerah\Exceptions\SeerahImportException;
use App\Domains\Seerah\Exceptions\SeerahImportLockedException;
use App\Domains\Seerah\Exceptions\SeerahIntegrityException;
use App\Domains\Seerah\Import\SeerahImportResult;
use App\Domains\Seerah\Services\CanonicalBookBuilder;
use App\Domains\Seerah\Services\SeerahImporter;
use App\Domains\Seerah\Validation\Severity;
use Illuminate\Console\Command;

/**
 * Imports the reviewed Seerah data into the seerah_* tables (ADR 0091, Phase 8 step 23). Production needs --release (and refuses
 * --structure); outside production one of --structure or --release is required. Not wired into the web start (step 26).
 */
final class ImportSeerahCommand extends Command
{
    protected $signature = 'seerah:import
        {--structure : Draft data (structure mode): outside production only}
        {--release : Release mode: every record approved, every flag decided, every group signed (required in production)}
        {--data= : The data folder (default database/data/seerah)}
        {--build-packs : Build the pack now, after the import}
        {--defer-pack : Neither build nor queue the pack; the web start builds it (ADR 0044)}';

    protected $description = 'Import the reviewed Seerah data into the seerah_* tables (ADR 0091, Phase 8 step 23).';

    public function handle(SeerahImporter $importer, CanonicalBookBuilder $builder): int
    {
        $structure = (bool) $this->option('structure');
        $release = (bool) $this->option('release');

        if ($structure === $release) {
            $this->error(app()->isProduction()
                ? 'Production imports need --release.'
                : 'Choose one mode: --structure (draft) or --release.');

            return self::FAILURE;
        }

        $directory = (string) ($this->option('data') ?: database_path('data/seerah'));

        try {
            $build = $builder->build(null);
        } catch (SeerahCanonicalException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        try {
            $result = $importer->run(
                $directory,
                $release ? ImportMode::Release : ImportMode::Structure,
                $build,
                (bool) $this->option('build-packs'),
                (bool) $this->option('defer-pack'),
                app()->isProduction(),
            );
        } catch (SeerahImportException|SeerahImportLockedException|SeerahIntegrityException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        foreach ($result->issues as $issue) {
            $line = sprintf('[%s] %-7s %s: %s', $issue->rule, $issue->severity->value, $issue->where, $issue->message);

            if ($issue->severity === Severity::Error) {
                $this->line('<error>'.$line.'</error>');
            } elseif ($issue->severity === Severity::Warning) {
                $this->line('<comment>'.$line.'</comment>');
            }
        }

        if ($result->status === SeerahImportResult::REFUSED) {
            $this->error('seerah:import refused: the data does not validate. Nothing was written.');

            return self::FAILURE;
        }

        $this->info(sprintf(
            'seerah:import %s: resource %d, version %s.',
            $result->status,
            $result->resourceId ?? 0,
            $result->versionAfter === null ? '-' : (string) $result->versionAfter,
        ));

        foreach ($result->counts as $table => $count) {
            $this->line(sprintf('  %-26s %6d', $table, $count));
        }

        if ($result->pack !== null) {
            $this->line('pack: '.json_encode($result->pack, JSON_THROW_ON_ERROR));
        }

        return self::SUCCESS;
    }
}
