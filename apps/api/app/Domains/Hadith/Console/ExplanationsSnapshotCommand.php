<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Console;

use App\Domains\Azkar\Exceptions\SnapshotException;
use App\Domains\Azkar\Sources\HadeethEncSnapshot;
use App\Domains\Azkar\Sources\HadeethEncSnapshotter;
use App\Support\Storage\SourceCache;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

/**
 * Fetches the HadeethEnc Arabic snapshot for the hadith explanations (ADR 0078 step 1), pinned like the Duas snapshot.
 */
final class ExplanationsSnapshotCommand extends Command
{
    protected $signature = 'hadith:explanations-snapshot
        {--date= : The snapshot date, YYYY-MM-DD (default today, UTC)}
        {--pinned : Use the date in config and keep the snapshot only if its manifest SHA-256 matches the pin}';

    protected $description = 'Fetch the HadeethEnc snapshot for hadith explanations with a SHA-256 manifest pin (ADR 0078).';

    private const string CONFIG_PREFIX = 'hadith_explanations.hadeethenc';

    private const string STORAGE_RELATIVE = 'hadith_explanations/hadeethenc';

    public function handle(HadeethEncSnapshotter $snapshotter, HadeethEncSnapshot $snapshot): int
    {
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

        $pin = (string) config(self::CONFIG_PREFIX.'.snapshot_sha256', '');

        if ($pinned && $pin !== '' && $this->existsAndMatches($date, $pin, $snapshot)) {
            $this->info('Snapshot already pinned: '.SourceCache::path(self::STORAGE_RELATIVE.'/'.$date));

            return self::SUCCESS;
        }

        try {
            $result = $snapshotter->take($date, self::CONFIG_PREFIX, self::STORAGE_RELATIVE);
        } catch (SnapshotException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        if ($pinned) {
            if ($pin === '' || ! hash_equals($pin, $result['manifest_sha256'])) {
                File::deleteDirectory($result['directory']);
                $this->error('The hadith explanations snapshot does not match its pin in config; it was deleted and will not be used.');

                return self::FAILURE;
            }

            $this->info('Snapshot verified against the pin: '.$result['directory']);

            return self::SUCCESS;
        }

        $this->info('Snapshot written: '.$result['directory']);
        $this->line(collect($result)->except(['directory', 'manifest_sha256'])->map(fn (mixed $value, string $key): string => $key.'='.$value)->implode(' '));
        $this->line('Pin for config/hadith_explanations.php (hadith_explanations.hadeethenc):');
        $this->line("  'snapshot_date' => '{$date}',");
        $this->line("  'snapshot_sha256' => '{$result['manifest_sha256']}',");

        return self::SUCCESS;
    }

    /**
     * An existing folder whose manifest matches the pin and whose files verify (the snapshot loader checks every hash).
     */
    private function existsAndMatches(string $date, string $pin, HadeethEncSnapshot $snapshot): bool
    {
        $directory = SourceCache::path(self::STORAGE_RELATIVE.'/'.$date);

        if (! File::isFile($directory.DIRECTORY_SEPARATOR.'manifest.json')) {
            return false;
        }

        try {
            $snapshot->load($directory, self::CONFIG_PREFIX);
        } catch (SnapshotException) {
            return false;
        }

        return true;
    }
}
