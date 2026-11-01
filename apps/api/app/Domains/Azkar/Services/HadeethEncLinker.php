<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Services;

use App\Support\QuranText\SearchTextNormalizer;

/**
 * Finds candidate links between an Azkar entry and a HadeethEnc hadith (ADR 0031 §12, step-13 §4).
 *
 * A recitation text links to a hadith when its normalised form is contained in the hadith's normalised form, and it is
 * at least `min_match_chars` long. Rows hold the hadith id and the match length only, never text. A row the developer
 * has marked reviewed is kept as it is.
 */
final class HadeethEncLinker
{
    public function __construct(
        private readonly SearchTextNormalizer $normalizer,
    ) {}

    /**
     * @param  array<string, mixed>  $catalogue  The raw OpenDua catalogue.
     * @param  array<int, array<string, mixed>>  $records  The verified HadeethEnc hadith records, by id.
     * @param  array<string, list<array<string, int|string>>>  $existing  The links as they are now.
     * @return array{rows: array<string, list<array<string, int|string>>>, stats: array<string, int>}
     */
    public function build(array $catalogue, array $records, array $existing): array
    {
        $min = (int) config('azkar.hadeethenc.min_match_chars', 40);
        $hadiths = [];

        foreach ($records as $id => $record) {
            $text = $record['hadeeth'] ?? null;

            if (is_string($text) && $text !== '') {
                $hadiths[$id] = $this->normalizer->normalize($text);
            }
        }

        ksort($hadiths);
        $collectionId = (string) config('azkar.opendua.collection_id');
        $rows = [];
        $stats = ['entries_checked' => 0, 'entries_linked' => 0, 'links' => 0, 'reviewed_kept' => 0];

        foreach (is_array($catalogue['entries'] ?? null) ? $catalogue['entries'] : [] as $index => $entry) {
            if (! is_array($entry) || ! is_string($entry['id'] ?? null)) {
                continue;
            }

            $entryKey = $collectionId.':'.$entry['id'];
            $stats['entries_checked']++;
            $best = [];

            foreach ($this->recitationTexts($entry) as $text) {
                $needle = $this->normalizer->normalize($text);
                $length = mb_strlen($needle);

                if ($length < $min) {
                    continue;
                }

                foreach ($hadiths as $id => $haystack) {
                    if (str_contains($haystack, $needle)) {
                        $best[$id] = max($best[$id] ?? 0, $length);
                    }
                }
            }

            $linked = [];

            foreach ($best as $id => $length) {
                $linked[] = ['hadeeth_id' => (int) $id, 'status' => 'candidate', 'evidence' => 'contains:'.$length];
            }

            $merged = $this->keepReviewed($linked, $existing[$entryKey] ?? [], $stats);

            if ($merged !== []) {
                $rows[$entryKey] = $merged;
                $stats['entries_linked']++;
                $stats['links'] += count($merged);
            }
        }

        foreach ($existing as $entryKey => $old) {
            if (! array_key_exists($entryKey, $rows)) {
                $kept = array_values(array_filter($old, static fn (array $link): bool => ($link['status'] ?? null) === 'reviewed'));

                if ($kept !== []) {
                    $rows[$entryKey] = $kept;
                    $stats['reviewed_kept'] += count($kept);
                }
            }
        }

        return ['rows' => $rows, 'stats' => $stats];
    }

    /**
     * @param  array<string, mixed>  $entry
     * @return list<string>
     */
    private function recitationTexts(array $entry): array
    {
        $texts = [];
        $variations = is_array($entry['variations'] ?? null) ? $entry['variations'] : [['steps' => $entry['steps'] ?? []]];

        foreach ($variations as $variation) {
            foreach (is_array($variation) && is_array($variation['steps'] ?? null) ? $variation['steps'] : [] as $step) {
                if (! is_array($step) || ($step['type'] ?? null) !== 'recitation') {
                    continue;
                }

                foreach (is_array($step['items'] ?? null) ? $step['items'] : [] as $item) {
                    $arabic = is_array($item) && is_array($item['dua'] ?? null) ? ($item['dua']['arabic'] ?? null) : null;

                    if (is_string($arabic) && $arabic !== '') {
                        $texts[] = $arabic;
                    }
                }
            }
        }

        return $texts;
    }

    /**
     * @param  list<array<string, int|string>>  $fresh
     * @param  list<array<string, int|string>>  $old
     * @param  array<string, int>  $stats
     * @return list<array<string, int|string>>
     */
    private function keepReviewed(array $fresh, array $old, array &$stats): array
    {
        $reviewed = [];

        foreach ($old as $link) {
            if (($link['status'] ?? null) === 'reviewed') {
                $reviewed[(int) $link['hadeeth_id']] = $link;
            }
        }

        $merged = [];

        foreach ($fresh as $link) {
            $id = (int) $link['hadeeth_id'];

            if (isset($reviewed[$id])) {
                $merged[] = $reviewed[$id];
                $stats['reviewed_kept']++;
                unset($reviewed[$id]);

                continue;
            }

            $merged[] = $link;
        }

        foreach ($reviewed as $link) {
            $merged[] = $link;
            $stats['reviewed_kept']++;
        }

        return $merged;
    }
}
