<?php

declare(strict_types=1);

namespace App\Domains\Content\Console;

use Illuminate\Console\Command;

/**
 * One command for all recitation content (audio catalogues and timings), local and production (ADR 0060, ADR 0061,
 * ADR 0074, ADR 0095). The steps run in this order:
 *
 *  1. mp3quran:import --defer-pack.
 *  2. way2quran:import --defer-pack, only when the Way2Quran manifest file exists; otherwise it is skipped.
 *  3. recitation-timings:import --defer-pack.
 *  4. content:ensure-packs.
 *
 * Every step stops the setup when it fails.
 */
final class SetupRecitationsCommand extends Command
{
    protected $signature = 'recitations:setup';

    protected $description = 'Import the MP3Quran and Way2Quran recitation catalogues and the recitation timings with deferred pack builds, then ensure content packs (local/production setup).';

    public function handle(): int
    {
        if ($this->runStep('mp3quran:import', ['--defer-pack' => true]) !== self::SUCCESS) {
            return self::FAILURE;
        }

        if (is_file((string) config('quran.way2quran_manifest_path'))) {
            if ($this->runStep('way2quran:import', ['--defer-pack' => true]) !== self::SUCCESS) {
                return self::FAILURE;
            }
        } else {
            $this->info('recitations:setup: no Way2Quran manifest yet; skipped.');
        }

        if ($this->runStep('recitation-timings:import', ['--defer-pack' => true]) !== self::SUCCESS) {
            return self::FAILURE;
        }

        if ($this->runStep('content:ensure-packs') !== self::SUCCESS) {
            return self::FAILURE;
        }

        $this->info('Recitations setup finished: catalogues and timings imported, content packs ensured.');

        return self::SUCCESS;
    }

    /**
     * @param  array<string, mixed>  $arguments
     */
    private function runStep(string $command, array $arguments = []): int
    {
        $exitCode = $this->call($command, $arguments);

        if ($exitCode !== self::SUCCESS) {
            $this->error('recitations:setup failed at '.$command.'.');
        }

        return $exitCode;
    }
}
