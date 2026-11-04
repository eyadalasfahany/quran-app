<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Console;

use Illuminate\Console\Command;

/**
 * Runs the Azkar audio sync, verify, catalogue import (deferred pack), and content pack ensure chain for local and
 * production setup (ADR 0040, ADR 0044).
 */
final class SetupAzkarCommand extends Command
{
    protected $signature = 'azkar:setup
        {--from= : Copy audio files from this folder instead of downloading (passed to azkar:audio-sync)}
        {--full : Also SHA-256 verify every audio file (passed to azkar:audio-verify)}';

    protected $description = 'Sync Azkar audio, verify it, import the catalogue with deferred pack build, then ensure content packs (local/production setup).';

    public function handle(): int
    {
        if ($this->runStep('azkar:audio-sync', $this->syncArguments()) !== self::SUCCESS) {
            return self::FAILURE;
        }

        if ($this->runStep('azkar:audio-verify', $this->verifyArguments()) !== self::SUCCESS) {
            return self::FAILURE;
        }

        if ($this->runStep('azkar:import', [
            '--download' => true,
            '--defer-pack' => true,
        ]) !== self::SUCCESS) {
            return self::FAILURE;
        }

        if ($this->runStep('content:ensure-packs') !== self::SUCCESS) {
            return self::FAILURE;
        }

        $this->info('Azkar setup finished: audio synced and verified, catalogue imported, content packs ensured.');

        return self::SUCCESS;
    }

    /**
     * @param  array<string, mixed>  $arguments
     */
    private function runStep(string $command, array $arguments = []): int
    {
        $exitCode = $this->call($command, $arguments);

        if ($exitCode !== self::SUCCESS) {
            $this->error('azkar:setup failed at '.$command.'.');
        }

        return $exitCode;
    }

    /**
     * @return array<string, string>
     */
    private function syncArguments(): array
    {
        $from = $this->option('from');

        if (! is_string($from) || $from === '') {
            return [];
        }

        return ['--from' => $from];
    }

    /**
     * @return array<string, bool>
     */
    private function verifyArguments(): array
    {
        if ((bool) $this->option('full')) {
            return ['--full' => true];
        }

        return [];
    }
}
