<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Services;

use App\Domains\Hadith\Overlay\HadithWordSet;
use App\Domains\Hadith\Repositories\Contracts\HadithExplanationRepository;

/**
 * ADR 0078 step 2: maps HadeethEnc explanations to our hadith by rule. A record is compared only with the collections its
 * attribution names. Containment is the share of the record's matn words that a hadith of that collection contains. A link
 * needs containment at least the minimum, and at least the gap above the collection's second-best hadith. Thresholds are
 * integer percents, so the boundaries are exact (no float rounding).
 *
 * The negative control compares each record with one collection it is not named in (chosen by position, so it is
 * repeatable). Its accepts are an upper bound on false accepts: the same hadith often appears in two collections.
 */
final class HadithExplanationMapper
{
    public function __construct(private readonly HadithExplanationRepository $hadith) {}

    /**
     * @param  list<array{id: int, attribution: string, text: string}>  $records  in snapshot order
     * @param  list<string>  $collections  the configured slugs, in order
     * @return array{records: int, named: int, unnamed: int, pairs: list<array{kind: string, collection: string, id: int, size: int, best: int, second: int, number: ?string}>}
     */
    public function measure(array $records, array $collections): array
    {
        $named = [];
        $unnamed = 0;

        foreach ($records as $record) {
            $named[$record['id']] = HadithAttributionNames::collections($record['attribution'], $collections);

            if ($named[$record['id']] === []) {
                $unnamed++;
            }
        }

        $control = [];

        foreach ($records as $position => $record) {
            $others = array_values(array_diff($collections, $named[$record['id']]));

            if ($others !== []) {
                $control[$record['id']] = $others[$position % count($others)];
            }
        }

        $pairs = [];

        foreach ($collections as $slug) {
            $targets = [];

            foreach ($records as $record) {
                if (in_array($slug, $named[$record['id']], true)) {
                    $targets[] = ['real', $record];
                } elseif (($control[$record['id']] ?? null) === $slug) {
                    $targets[] = ['control', $record];
                }
            }

            if ($targets === []) {
                continue;
            }

            $entries = [];

            foreach ($this->hadith->collectionHadith($slug) as $row) {
                $entries[] = ['number' => $row['number'], 'set' => HadithWordSet::of($row['text'])];
            }

            foreach ($targets as [$kind, $record]) {
                $words = HadithWordSet::of($record['text']);
                [$best, $second, $number] = $this->bestAndSecond($words, $entries);

                $pairs[] = [
                    'kind' => $kind,
                    'collection' => $slug,
                    'id' => $record['id'],
                    'size' => count($words),
                    'best' => $best,
                    'second' => $second,
                    'number' => $number,
                ];
            }
        }

        return ['records' => count($records), 'named' => count($records) - $unnamed, 'unnamed' => $unnamed, 'pairs' => $pairs];
    }

    /**
     * accepted, ambiguous (contained enough, but no clear lead) or below. Integer arithmetic: best/size >= min/100 and
     * (best - second)/size >= gap/100 without floats.
     */
    public static function classify(int $size, int $best, int $second, int $minPercent, int $gapPercent): string
    {
        if ($size === 0 || $best * 100 < $size * $minPercent) {
            return 'below';
        }

        if (($best - $second) * 100 < $size * $gapPercent) {
            return 'ambiguous';
        }

        return 'accepted';
    }

    /**
     * The accepted links of the measured real pairs (never the controls).
     *
     * @param  list<array{kind: string, collection: string, id: int, size: int, best: int, second: int, number: ?string}>  $pairs
     * @return list<array{collection: string, number: string, explanation_id: int, status: string, evidence: string}>
     */
    public static function links(array $pairs, int $minPercent, int $gapPercent): array
    {
        $links = [];

        foreach ($pairs as $pair) {
            if ($pair['kind'] !== 'real' || $pair['number'] === null) {
                continue;
            }

            if (self::classify($pair['size'], $pair['best'], $pair['second'], $minPercent, $gapPercent) !== 'accepted') {
                continue;
            }

            $links[] = [
                'collection' => $pair['collection'],
                'number' => $pair['number'],
                'explanation_id' => $pair['id'],
                'status' => 'accepted',
                'evidence' => sprintf('shared=%d;size=%d;second=%d', $pair['best'], $pair['size'], $pair['second']),
            ];
        }

        return $links;
    }

    /**
     * @param  array<string, true>  $words
     * @param  list<array{number: string, set: array<string, true>}>  $entries
     * @return array{0: int, 1: int, 2: ?string}
     */
    private function bestAndSecond(array $words, array $entries): array
    {
        $best = 0;
        $second = 0;
        $number = null;

        if ($words === []) {
            return [0, 0, null];
        }

        foreach ($entries as $entry) {
            $shared = count(array_intersect_key($words, $entry['set']));

            if ($shared > $best) {
                $second = $best;
                $best = $shared;
                $number = $entry['number'];
            } elseif ($shared > $second) {
                $second = $shared;
            }
        }

        return [$best, $second, $number];
    }
}
