<?php

declare(strict_types=1);

namespace App\Domains\Duas\Console;

use App\Domains\Azkar\Exceptions\SnapshotException;
use App\Domains\Azkar\Sources\HadeethEncSnapshotter;
use App\Domains\Azkar\Sources\PinnedSnapshotVerifier;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

/**
 * Fetches the Duas HadeethEnc snapshot and prints the pin for config/duas.php (ADR 0044-duas §3).
 */
final class SnapshotCommand extends Command
{
    protected $signature = 'duas:snapshot
        {source : The source to snapshot (hadeethenc)}
        {--date= : The snapshot date, YYYY-MM-DD (default today, UTC)}
        {--pinned : Fetch the configured snapshot date and keep it only if its SHA-256 matches the pin in config}';

    protected $description = 'Fetch a HadeethEnc snapshot for Duas with a SHA-256 manifest pin (ADR 0044-duas §3).';

    private const string CONFIG_PREFIX = 'duas.hadeethenc';

    private const string STORAGE_RELATIVE = 'duas/hadeethenc';

    public function handle(
        HadeethEncSnapshotter $snapshotter,
        PinnedSnapshotVerifier $pinnedVerifier,
    ): int {
        $source = (string) $this->argument('source');

        if ($source !== 'hadeethenc') {
            $this->error('Only the hadeethenc snapshot is supported for Duas.');

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
            $date = (string) config(self::CONFIG_PREFIX.'.snapshot_date');
        }

        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) !== 1) {
            $this->error('The date must be YYYY-MM-DD.');

            return self::FAILURE;
        }

        if ($pinned) {
            $pin = (string) config(self::CONFIG_PREFIX.'.snapshot_sha256', '');
            $existing = $pinnedVerifier->existing($source, $date, $pin, 'duas');

            if ($existing !== null) {
                $this->info('Snapshot already pinned: '.$existing['directory']);

                return self::SUCCESS;
            }
        }

        try {
            $result = $snapshotter->take($date, self::CONFIG_PREFIX, self::STORAGE_RELATIVE);
        } catch (SnapshotException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        if ($pinned) {
            $pin = (string) config(self::CONFIG_PREFIX.'.snapshot_sha256', '');

            if ($pin === '' || ! hash_equals($pin, $result['manifest_sha256'])) {
                File::deleteDirectory($result['directory']);
                $this->error('The Duas hadeethenc snapshot does not match its pin in config; it was deleted and will not be imported.');

                return self::FAILURE;
            }

            $this->info('Snapshot verified against the pin: '.$result['directory']);

            return self::SUCCESS;
        }

        $this->info('Snapshot written: '.$result['directory']);
        $this->line(collect($result)->except(['directory', 'manifest_sha256'])->map(fn (mixed $value, string $key): string => $key.'='.$value)->implode(' '));
        $this->line('Pin for config/duas.php (duas.hadeethenc):');
        $this->line("  'snapshot_date' => '{$date}',");
        $this->line("  'snapshot_sha256' => '{$result['manifest_sha256']}',");

        return self::SUCCESS;
    }
}
