<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Console;

use App\Domains\Azkar\Exceptions\SnapshotException;
use App\Domains\Hadith\Exceptions\HadithDataFileException;
use App\Domains\Hadith\Exceptions\HadithExplanationException;
use App\Domains\Hadith\Services\HadithExplanationImporter;
use Illuminate\Console\Command;

/**
 * ADR 0078 step 5: imports the HadeethEnc explanations and their links into the database and records the resource's
 * version. Dev and deploy command; the pack is built inline with --build-packs, otherwise the queue builds it.
 */
final class ImportExplanationsCommand extends Command
{
    protected $signature = 'hadith:import-explanations
        {--dry-run : Check the pins and count the rows without writing}
        {--build-packs : Build the pack now instead of queueing it}';

    protected $description = 'Import the pinned HadeethEnc explanations and their text-free links (ADR 0078).';

    public function handle(HadithExplanationImporter $importer): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $buildPacks = (bool) $this->option('build-packs');

        if ($dryRun && $buildPacks) {
            $this->error('Give --dry-run or --build-packs, not both.');

            return self::FAILURE;
        }

        try {
            $result = $importer->run($dryRun, $buildPacks);
        } catch (HadithExplanationException|HadithDataFileException|SnapshotException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->table(['Metric', 'Value'], [
            ['status', $result['status']],
            ['explanations', $result['explanations']],
            ['links', $result['links']],
            ['resource id', $result['resource_id'] ?? '-'],
            ['version', $result['version'] ?? '-'],
        ]);

        if ($result['status'] === HadithExplanationImporter::STATUS_NO_SNAPSHOT) {
            $this->warn('No pinned snapshot: nothing imported (not an error).');
        }

        if ($result['status'] === HadithExplanationImporter::STATUS_NO_LINKS) {
            $this->warn('No pinned links file: nothing imported (not an error).');
        }

        return self::SUCCESS;
    }
}
