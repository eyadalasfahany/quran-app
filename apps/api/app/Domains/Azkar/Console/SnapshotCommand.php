<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Console;

use App\Domains\Azkar\Exceptions\SnapshotException;
use App\Domains\Azkar\Sources\HadeethEncSnapshotter;
use App\Domains\Azkar\Sources\HisnMuslimSnapshotter;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

/**
 * Fetches a source snapshot and prints the pin to record in config/azkar.php (ADR 0031 §12). Nothing is pinned
 * automatically: the developer copies the printed values.
 */
final class SnapshotCommand extends Command
{
    protected $signature = 'azkar:snapshot
        {source : The source to snapshot (hisnmuslim or hadeethenc)}
        {--date= : The snapshot date, YYYY-MM-DD (default today, UTC)}';

    protected $description = 'Fetch a source snapshot with a SHA-256 manifest for the Azkar import pin (ADR 0031 §12).';

    public function handle(HisnMuslimSnapshotter $hisnmuslim, HadeethEncSnapshotter $hadeethenc): int
    {
        $source = (string) $this->argument('source');

        if (! in_array($source, ['hisnmuslim', 'hadeethenc'], true)) {
            $this->error('Only the hisnmuslim and hadeethenc snapshots are supported here.');

            return self::FAILURE;
        }

        $option = $this->option('date');
        $date = is_string($option) && $option !== '' ? $option : CarbonImmutable::now('UTC')->format('Y-m-d');

        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) !== 1) {
            $this->error('The date must be YYYY-MM-DD.');

            return self::FAILURE;
        }

        try {
            $result = $source === 'hadeethenc' ? $hadeethenc->take($date) : $hisnmuslim->take($date);
        } catch (SnapshotException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->info('Snapshot written: '.$result['directory']);
        $this->line(collect($result)->except(['directory', 'manifest_sha256'])->map(fn (mixed $value, string $key): string => $key.'='.$value)->implode(' '));
        $this->line('Pin for config/azkar.php (azkar.'.$source.'):');
        $this->line("  'snapshot_date' => '{$date}',");
        $this->line("  'snapshot_sha256' => '{$result['manifest_sha256']}',");

        return self::SUCCESS;
    }
}
