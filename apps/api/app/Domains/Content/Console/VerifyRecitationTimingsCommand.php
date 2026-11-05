<?php

declare(strict_types=1);

namespace App\Domains\Content\Console;

use App\Domains\Content\Models\TaybahTimingSet;
use App\Domains\Content\Repositories\Contracts\TaybahTimingRepository;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Read-only. Lists the stored Taybah timing sets whose audio no longer matches the current chapter audio file (stale
 * sets are not served, ADR 0060), and the number of sets per recitation.
 */
final class VerifyRecitationTimingsCommand extends Command
{
    protected $signature = 'recitation-timings:verify';

    protected $description = 'Report stored Taybah timing sets that no longer match their chapter audio file (ADR 0060).';

    public function handle(TaybahTimingRepository $timings): int
    {
        $stale = $timings->staleSets();

        $counts = TaybahTimingSet::query()
            ->groupBy('recitation_id')
            ->orderBy('recitation_id')
            ->get(['recitation_id', DB::raw('COUNT(*) AS sets')]);

        $this->table(['Recitation', 'Sets'], $counts->map(
            static fn (TaybahTimingSet $set): array => [$set->recitation_id, $set->getAttribute('sets')],
        )->all());

        if ($stale->isEmpty()) {
            $this->line('No stale timing sets.');

            return self::SUCCESS;
        }

        $this->table(['Recitation', 'Chapter', 'Audio URL'], $stale->map(
            static fn (TaybahTimingSet $set): array => [$set->recitation_id, $set->chapter_id, $set->audio_url],
        )->all());
        $this->error(count($stale).' stale timing set(s).');

        return self::FAILURE;
    }
}
