<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Console;

use Illuminate\Console\Command;

/**
 * One command for all Hadith content, local and production (ADR 0042, ADR 0076, ADR 0078, ADR 0095). The steps run in
 * this order:
 *
 *  1. hadith:import --download --defer-pack (fetches and verifies the 12 pinned files, then imports).
 *  2. Unless --skip-explanations: hadith:explanations-snapshot --pinned, then hadith:import-explanations.
 *  3. content:ensure-packs.
 *
 * Every step stops the setup when it fails.
 */
final class SetupHadithCommand extends Command
{
    protected $signature = 'hadith:setup
        {--skip-explanations : Skip the HadeethEnc explanations (the first fetch takes about an hour)}';

    protected $description = 'Import the full hadith collections with a deferred pack build, then the HadeethEnc explanations and content packs (local/production setup).';

    public function handle(): int
    {
        if ($this->runStep('hadith:import', [
            '--download' => true,
            '--defer-pack' => true,
        ]) !== self::SUCCESS) {
            return self::FAILURE;
        }

        if (! (bool) $this->option('skip-explanations')) {
            if ($this->runStep('hadith:explanations-snapshot', ['--pinned' => true]) !== self::SUCCESS) {
                return self::FAILURE;
            }

            if ($this->runStep('hadith:import-explanations') !== self::SUCCESS) {
                return self::FAILURE;
            }
        }

        if ($this->runStep('content:ensure-packs') !== self::SUCCESS) {
            return self::FAILURE;
        }

        $explanations = (bool) $this->option('skip-explanations') ? 'explanations skipped' : 'explanations imported';

        $this->info('Hadith setup finished: collections imported, '.$explanations.', content packs ensured.');

        return self::SUCCESS;
    }

    /**
     * @param  array<string, mixed>  $arguments
     */
    private function runStep(string $command, array $arguments = []): int
    {
        $exitCode = $this->call($command, $arguments);

        if ($exitCode !== self::SUCCESS) {
            $this->error('hadith:setup failed at '.$command.'.');
        }

        return $exitCode;
    }
}
