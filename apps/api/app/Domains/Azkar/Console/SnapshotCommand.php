<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Console;

use App\Domains\Azkar\Exceptions\SnapshotException;
use App\Domains\Azkar\Sources\HadeethEncSnapshotter;
use App\Domains\Azkar\Sources\HisnMuslimSnapshotter;
use App\Domains\Azkar\Sources\PinnedSnapshotVerifier;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

/**
 * Fetches a source snapshot and prints the pin to record in config/azkar.php (ADR 0031 §12). Nothing is pinned
 * automatically: the developer copies the printed values.
 *
 * --pinned (plan step 14 §6, release runs) fetches the configured snapshot date and keeps the result only when its
 * manifest SHA-256 is the configured pin. A snapshot that does not match is deleted, so the import never reads it.
 */
final class SnapshotCommand extends Command
{
    protected $signature = 'azkar:snapshot
        {source : The source to snapshot (hisnmuslim or hadeethenc)}
        {--date= : The snapshot date, YYYY-MM-DD (default today, UTC)}
        {--pinned : Fetch the configured snapshot date and keep it only if its SHA-256 matches the pin in config}';

    protected $description = 'Fetch a source snapshot with a SHA-256 manifest for the Azkar import pin (ADR 0031 §12).';

    public function handle(
        HisnMuslimSnapshotter $hisnmuslim,
        HadeethEncSnapshotter $hadeethenc,
        PinnedSnapshotVerifier $pinnedVerifier,
    ): int {
        $source = (string) $this->argument('source');

        if (! in_array($source, ['hisnmuslim', 'hadeethenc'], true)) {
            $this->error('Only the hisnmuslim and hadeethenc snapshots are supported here.');

            return self::FAILURE;
        }

        $pinned = (bool) $this->option('pinned');
        $option = $this->option('date');

        if ($pinned && is_string($option) && $option !== '') {
            $this->error('Give --pinned or --date, not both: --pinned uses the date in config.');

            return self::FAILURE;
        }

        $date = is_string($option) && $option !== '' ? $option : CarbonImmutable::now('UTC')->format('Y-m-d');

        if ($pinned) {
            $date = (string) config('azkar.'.$source.'.snapshot_date');
        }

        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) !== 1) {
            $this->error('The date must be YYYY-MM-DD.');

            return self::FAILURE;
        }

        if ($pinned) {
            $pin = (string) config('azkar.'.$source.'.snapshot_sha256', '');
            $existing = $pinnedVerifier->existing($source, $date, $pin);

            if ($existing !== null) {
                $this->info('Snapshot already pinned: '.$existing['directory']);

                return self::SUCCESS;
            }
        }

        try {
            $result = $source === 'hadeethenc' ? $hadeethenc->take($date) : $hisnmuslim->take($date);
        } catch (SnapshotException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        if ($pinned) {
            $pin = (string) config('azkar.'.$source.'.snapshot_sha256', '');

            if ($pin === '' || ! hash_equals($pin, $result['manifest_sha256'])) {
                File::deleteDirectory($result['directory']);
                $this->error('The '.$source.' snapshot does not match its pin in config; it was deleted and will not be imported.');

                return self::FAILURE;
            }

            $this->info('Snapshot verified against the pin: '.$result['directory']);

            return self::SUCCESS;
        }

        $this->info('Snapshot written: '.$result['directory']);
        $this->line(collect($result)->except(['directory', 'manifest_sha256'])->map(fn (mixed $value, string $key): string => $key.'='.$value)->implode(' '));
        $this->line('Pin for config/azkar.php (azkar.'.$source.'):');
        $this->line("  'snapshot_date' => '{$date}',");
        $this->line("  'snapshot_sha256' => '{$result['manifest_sha256']}',");

        return self::SUCCESS;
    }
}
