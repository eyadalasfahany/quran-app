<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Console;

use App\Domains\Azkar\Audio\AzkarAudioSync;
use App\Domains\Azkar\Exceptions\AudioException;
use Illuminate\Console\Command;

/**
 * Puts the 238 shipped Azkar recordings on the azkar_audio disk (ADR 0040, step 14). Resumable and idempotent: a file
 * already present with the manifest's size and SHA-256 is skipped. Excluded entries are never fetched.
 */
final class SyncAzkarAudioCommand extends Command
{
    protected $signature = 'azkar:audio-sync
        {--from= : Copy the files by name from this folder instead of downloading them (each file is still checked)}';

    protected $description = 'Download or copy the shipped Azkar recordings to the azkar_audio disk and verify each one (ADR 0040).';

    public function handle(AzkarAudioSync $sync): int
    {
        $from = $this->option('from');
        $from = is_string($from) && $from !== '' ? $from : null;

        if ($from !== null && ! is_dir($from)) {
            $this->error('The --from folder does not exist.');

            return self::FAILURE;
        }

        try {
            $result = $sync->run($from);
        } catch (AudioException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->table(['Metric', 'Value'], [
            ['shipped', $result['shipped']],
            ['already present and verified', $result['present']],
            ['written and verified now', $result['written']],
            ['failed', count($result['failed'])],
        ]);

        if ($result['failed'] !== []) {
            $this->error('Not verified: '.implode(', ', array_slice($result['failed'], 0, 20)).(count($result['failed']) > 20 ? ' …' : ''));
            $this->line('Rerun azkar:audio-sync to resume. Nothing unverified was kept.');

            return self::FAILURE;
        }

        $this->info('All shipped recordings are present and verified.');

        return self::SUCCESS;
    }
}
