<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Console;

use Illuminate\Console\Command;

/**
 * One command for all Azkar content, local and production (ADR 0040, ADR 0044, ADR 0031 §12). The steps run in this
 * order:
 *
 *  1. azkar:audio-sync and azkar:audio-verify (skipped with --skip-audio, for a machine without network for audio).
 *  2. azkar:snapshot for hisnmuslim, then hadeethenc, both with --pinned. A snapshot that is not fetched or does not
 *     match its pin prints a warning and the setup continues: the import runs without that source.
 *  3. azkar:import --download --defer-pack.
 *  4. content:ensure-packs.
 *
 * Every other step stops the setup when it fails.
 */
final class SetupAzkarCommand extends Command
{
    /**
     * @var list<string>
     */
    private const PINNED_SNAPSHOT_SOURCES = ['hisnmuslim', 'hadeethenc'];

    protected $signature = 'azkar:setup
        {--from= : Copy audio files from this folder instead of downloading (passed to azkar:audio-sync)}
        {--full : Also SHA-256 verify every audio file (passed to azkar:audio-verify)}
        {--skip-audio : Skip azkar:audio-sync and azkar:audio-verify (for a machine without network for audio)}';

    protected $description = 'Sync and verify Azkar audio, pin the hisnmuslim and hadeethenc snapshots, import the catalogue with deferred pack build, then ensure content packs (local/production setup).';

    public function handle(): int
    {
        $skipAudio = (bool) $this->option('skip-audio');

        if (! $skipAudio) {
            if ($this->runStep('azkar:audio-sync', $this->syncArguments()) !== self::SUCCESS) {
                return self::FAILURE;
            }

            if ($this->runStep('azkar:audio-verify', $this->verifyArguments()) !== self::SUCCESS) {
                return self::FAILURE;
            }
        }

        foreach (self::PINNED_SNAPSHOT_SOURCES as $source) {
            $this->runPinnedSnapshot($source);
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

        $audio = $skipAudio ? 'audio skipped' : 'audio synced and verified';

        $this->info('Azkar setup finished: '.$audio.', pinned snapshots taken, catalogue imported, content packs ensured.');

        return self::SUCCESS;
    }

    /**
     * A failed snapshot is not fatal: the import then runs without that source (docker/start-web.sh snapshot_pinned).
     */
    private function runPinnedSnapshot(string $source): void
    {
        $exitCode = $this->call('azkar:snapshot', [
            'source' => $source,
            '--pinned' => true,
        ]);

        if ($exitCode !== self::SUCCESS) {
            $this->warn('azkar:setup: '.$source.' snapshot not fetched or not matching its pin; the import runs without it.');
        }
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
