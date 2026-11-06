<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Console;

use App\Domains\Hadith\Exceptions\HadithPinException;
use App\Domains\Hadith\Exceptions\HadithSourceFormatException;
use App\Domains\Hadith\Sources\HadithSnapshotter;
use App\Domains\Hadith\Sources\PinnedFileVerifier;
use App\Domains\Hadith\Sources\SnapshotStore;
use App\Integrations\HadithApiFawaz\HadithApiFawazException;
use Illuminate\Console\Command;

/**
 * Downloads the pinned fawazahmed0 files into the source cache and prints the SHA-256 map for the developer to review
 * (ADR 0042 §4). Never writes config/, never runs on a schedule, and `--record` is refused in production.
 */
final class HadithSnapshotCommand extends Command
{
    protected $signature = 'hadith:snapshot
        {--record : Download without verifying and print the hashes to pin (developer review; never in production)}';

    protected $description = 'Download the pinned fawazahmed0 hadith files into the source cache and print the SHA-256 map (ADR 0042).';

    public function handle(HadithSnapshotter $snapshotter, PinnedFileVerifier $verifier, SnapshotStore $store): int
    {
        $record = (bool) $this->option('record');

        if ($record && app()->isProduction()) {
            $this->error('hadith:snapshot --record is for the developer\'s machine; it is disabled in production.');

            return self::FAILURE;
        }

        if (! $record) {
            $missing = $verifier->unrecorded();

            if ($missing !== []) {
                $this->error('Some pins are not recorded. Run: php artisan hadith:snapshot --record');

                foreach ($missing as $path) {
                    $this->line('  '.$path);
                }

                return self::FAILURE;
            }
        }

        try {
            $results = $snapshotter->take($record);
        } catch (HadithApiFawazException|HadithPinException|HadithSourceFormatException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->line('Snapshot directory: '.$store->directory());
        $total = 0;
        $differs = 0;

        foreach ($results as $result) {
            $total += $result->bytes;

            if ($result->status === 'DIFFERS') {
                $differs++;
            }

            $this->line(sprintf('%s  %d bytes  sha256 %s  [%s]', $result->path, $result->bytes, $result->sha256, $result->status));
        }

        $this->line(count($results).' files, '.$total.' bytes total.');
        $this->line("Pin for config/hadith.php ('files'), for the developer to review and paste:");

        foreach ($results as $result) {
            $this->line("        '".$result->path."' => '".$result->sha256."',");
        }

        if ($record && $differs > 0) {
            $this->line($differs.' file(s) differ from the recorded pin; a SHA bump is a change the developer approves.');
        }

        return self::SUCCESS;
    }
}
