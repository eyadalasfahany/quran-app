<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Services;

use App\Domains\Azkar\Data\QuranSpanMatch;
use App\Domains\Azkar\OpenDua\StepFlattener;

/**
 * Builds the Quran reference map rows for every ﴿…﴾ span in a catalogue (ADR 0031 §11). Each span gets one row from
 * the matcher. A row the developer has marked `reviewed` is never overwritten: it is kept as it is, and an item whose
 * span count changed keeps its reviewed item whole and is counted as a conflict.
 *
 * ADR 0093: a span the matcher leaves unmatched is looked up as a run of words. Exactly one exact run in one surah gives
 * a candidate row with `words` (evidence `words:exact`). Several runs stay unmatched (`words:ambiguous:N`), and no run
 * stays unmatched with the matcher's row.
 */
final class QuranReferenceCandidates
{
    public function __construct(
        private readonly StepFlattener $flattener,
        private readonly QuranSegmenter $segmenter,
        private readonly QuranWordRunFinder $runs,
    ) {}

    /**
     * @param  array<string, mixed>  $catalogue
     * @param  array<string, list<array<array-key, mixed>>>  $existing  The map as it is now, keyed by item_key.
     * @param  string  $collectionId  The collection whose entry keys the map uses (<collection>:<entry id>).
     * @return array{rows: array<string, list<array<array-key, mixed>>>, stats: array<string, int>, items: array<string, array<string, int>>}
     */
    public function build(array $catalogue, array $existing, QuranSpanMatcher $matcher, string $collectionId): array
    {
        $rows = [];
        $items = [];
        $stats = [
            'items' => 0,
            'spans' => 0,
            'exact' => 0,
            'candidate_similarity' => 0,
            'unmatched' => 0,
            'multi_surah' => 0,
            'reviewed_kept' => 0,
            'reviewed_conflicts' => 0,
            'words_exact' => 0,
            'words_ambiguous' => 0,
        ];

        $entries = is_array($catalogue['entries'] ?? null) ? $catalogue['entries'] : [];

        foreach ($entries as $index => $entry) {
            if (! is_array($entry) || ! is_string($entry['id'] ?? null)) {
                continue;
            }

            $variations = $this->flattener->variationsOf($entry);

            if ($variations === null) {
                continue;
            }

            $entryKey = $collectionId.':'.$entry['id'];

            foreach ($variations as $variation) {
                foreach ($this->flattener->flatten($entryKey, (int) $index, $variation['id'], $variation['steps'])->items as $item) {
                    if ($item->textAr === null) {
                        continue;
                    }

                    $spans = array_values(array_filter(
                        $this->segmenter->scan($item->textAr)['pieces'],
                        static fn (array $piece): bool => $piece['kind'] === 'quran',
                    ));

                    if ($spans === []) {
                        continue;
                    }

                    $stats['items']++;
                    $counts = ['spans' => 0, 'exact' => 0, 'candidate' => 0, 'unmatched' => 0];
                    $fresh = [];

                    foreach ($spans as $span) {
                        $match = $matcher->match($span['text']);
                        $stats['spans']++;
                        $counts['spans']++;
                        $runs = $match->status === QuranSpanMatch::UNMATCHED ? $this->runs->find($span['text']) : [];

                        if (count($runs) === 1) {
                            $stats['words_exact']++;
                            $counts['candidate']++;
                            $fresh[] = $this->wordRow($runs[0]);

                            continue;
                        }

                        $this->count($match, $stats, $counts);
                        $row = $this->row($match);

                        if (count($runs) > 1) {
                            $stats['words_ambiguous']++;
                            $row['evidence'] = 'words:ambiguous:'.count($runs);
                        }

                        $fresh[] = $row;
                    }

                    $rows[$item->itemKey] = $this->keepReviewed($fresh, $existing[$item->itemKey] ?? null, $stats);
                    $items[$item->itemKey] = $counts;
                }
            }
        }

        foreach ($existing as $itemKey => $old) {
            if (! array_key_exists($itemKey, $rows) && $this->hasReviewed($old)) {
                $rows[$itemKey] = $old;
                $stats['reviewed_kept']++;
            }
        }

        return ['rows' => $rows, 'stats' => $stats, 'items' => $items];
    }

    /**
     * A candidate row for one exact word run (ADR 0093). A run inside one verse has verse_to null, as a whole verse does.
     *
     * @param  array{surah: int, verse_from: int, word_from: int, verse_to: int, word_to: int}  $run
     * @return array<array-key, mixed>
     */
    private function wordRow(array $run): array
    {
        $verseTo = $run['verse_to'] === $run['verse_from'] ? null : $run['verse_to'];

        return [
            $run['surah'],
            $run['verse_from'],
            $verseTo,
            'status' => QuranReferencePolicy::CANDIDATE,
            'evidence' => 'words:exact',
            'words' => [$run['word_from'], $run['word_to']],
        ];
    }

    /**
     * @return array<array-key, mixed>
     */
    private function row(QuranSpanMatch $match): array
    {
        $row = [$match->firstSurah(), $match->firstFrom(), $match->firstTo(), 'status' => $match->status, 'evidence' => $match->evidence];

        if ($match->check !== null) {
            $row['check'] = sprintf('uthmani:%.2f', $match->check);
        }

        if (count($match->ranges) > 1) {
            $row['ranges'] = $match->ranges;
        }

        return $row;
    }

    /**
     * @param  list<array<array-key, mixed>>  $fresh
     * @param  list<array<array-key, mixed>>|null  $old
     * @param  array<string, int>  $stats
     * @return list<array<array-key, mixed>>
     */
    private function keepReviewed(array $fresh, ?array $old, array &$stats): array
    {
        if ($old === null || ! $this->hasReviewed($old)) {
            return $fresh;
        }

        if (count($old) !== count($fresh)) {
            $stats['reviewed_conflicts']++;

            return $old;
        }

        $merged = [];

        foreach ($fresh as $position => $row) {
            if (($old[$position]['status'] ?? null) === QuranReferencePolicy::REVIEWED) {
                $merged[] = $old[$position];
                $stats['reviewed_kept']++;

                continue;
            }

            $merged[] = $row;
        }

        return $merged;
    }

    /**
     * @param  list<array<array-key, mixed>>  $rows
     */
    private function hasReviewed(array $rows): bool
    {
        foreach ($rows as $row) {
            if (($row['status'] ?? null) === QuranReferencePolicy::REVIEWED) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<string, int>  $stats
     * @param  array<string, int>  $counts
     */
    private function count(QuranSpanMatch $match, array &$stats, array &$counts): void
    {
        if (count($match->ranges) > 1) {
            $stats['multi_surah']++;
        }

        if ($match->status === QuranReferencePolicy::UNMATCHED) {
            $stats['unmatched']++;
            $counts['unmatched']++;

            return;
        }

        if ($match->evidence === 'exact-simple') {
            $stats['exact']++;
            $counts['exact']++;

            return;
        }

        $stats['candidate_similarity']++;
        $counts['candidate']++;
    }
}
