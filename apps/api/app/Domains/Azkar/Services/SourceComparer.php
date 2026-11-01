<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Services;

use App\Support\QuranText\SearchTextNormalizer;

/**
 * Compares OpenDua and hisnmuslim.com by book number (ADR 0031 §12). OpenDua's sourceReference is the book number;
 * hisnmuslim's entry ID is the same number. The result holds counts, statuses and positions only: never text.
 */
final class SourceComparer
{
    public function __construct(private readonly SearchTextNormalizer $normalizer) {}

    /**
     * @param  array<string, mixed>  $openDua  The raw OpenDua catalogue (as parsed).
     * @param  array<string, mixed>  $hisnMuslim  The converted hisnmuslim catalogue (as the importer sees it).
     * @return array{summary: array<string, int>, differing: list<array<string, int|string|null>>}
     */
    public function compare(array $openDua, array $hisnMuslim): array
    {
        [$od, $duplicates] = $this->indexOpenDua($openDua);
        $hm = $this->indexHisnMuslim($hisnMuslim);

        $summary = [
            'entries_opendua' => count($od),
            'entries_hisnmuslim' => count($hm),
            'numbers_in_both' => 0,
            'only_opendua' => 0,
            'only_hisnmuslim' => 0,
            'duplicate_opendua_numbers' => $duplicates,
            'arabic_identical' => 0,
            'arabic_normalised_equal' => 0,
            'arabic_equal_after_unwrapping' => 0,
            'arabic_different' => 0,
            'arabic_no_recitation' => 0,
            'arabic_multi_item' => 0,
            'repeat_match' => 0,
            'repeat_mismatch' => 0,
            'repeat_opendua_missing' => 0,
        ];
        $differing = [];

        foreach (array_unique([...array_keys($od), ...array_keys($hm)]) as $number) {
            if (! isset($hm[$number])) {
                $summary['only_opendua']++;

                continue;
            }

            if (! isset($od[$number])) {
                $summary['only_hisnmuslim']++;

                continue;
            }

            $summary['numbers_in_both']++;
            $left = $od[$number];
            $right = $hm[$number];

            if ($left['texts'] === []) {
                $summary['arabic_no_recitation']++;
            } else {
                if (count($left['texts']) > 1) {
                    $summary['arabic_multi_item']++;
                }

                $leftText = implode("\n", $left['texts']);

                if ($leftText === $right['text']) {
                    $summary['arabic_identical']++;
                } elseif ($this->normalizer->normalize($leftText) === $this->normalizer->normalize($right['text'])) {
                    $summary['arabic_normalised_equal']++;
                } elseif ($this->normalizer->normalize($leftText) === $this->normalizer->normalize($this->unwrap($right['text']))) {
                    // hisnmuslim wraps some texts in parentheses. Compared in memory only; the stored text keeps them.
                    $summary['arabic_equal_after_unwrapping']++;
                } else {
                    $summary['arabic_different']++;
                    $differing[] = [
                        'number' => (string) $number,
                        'status' => 'different',
                        'first_difference_codepoint' => $this->firstDifference($leftText, $right['text']),
                        'length_opendua_codepoints' => mb_strlen($leftText),
                        'length_hisnmuslim_codepoints' => mb_strlen($right['text']),
                    ];
                }
            }

            if ($left['times'] === null) {
                $summary['repeat_opendua_missing']++;
            } elseif ($left['times'] === $right['times']) {
                $summary['repeat_match']++;
            } else {
                $summary['repeat_mismatch']++;
                $differing[] = ['number' => (string) $number, 'status' => 'repeat', 'repeat_opendua' => $left['times'], 'repeat_hisnmuslim' => $right['times']];
            }
        }

        return ['summary' => $summary, 'differing' => $differing];
    }

    /**
     * @param  array<string, mixed>  $openDua
     * @return array{0: array<string, array{texts: list<string>, times: int|null}>, 1: int}
     */
    private function indexOpenDua(array $openDua): array
    {
        $index = [];
        $duplicates = 0;

        foreach (is_array($openDua['entries'] ?? null) ? $openDua['entries'] : [] as $entry) {
            $number = is_array($entry) ? ($entry['sourceReference'] ?? null) : null;

            if (! is_string($number) || $number === '') {
                continue;
            }

            if (isset($index[$number])) {
                $duplicates++;

                continue;
            }

            $index[$number] = $this->recitations($entry);
        }

        return [$index, $duplicates];
    }

    /**
     * @param  array<string, mixed>  $hisnMuslim
     * @return array<string, array{text: string, times: int|null}>
     */
    private function indexHisnMuslim(array $hisnMuslim): array
    {
        $index = [];

        foreach (is_array($hisnMuslim['entries'] ?? null) ? $hisnMuslim['entries'] : [] as $entry) {
            if (! is_array($entry) || ! is_string($entry['id'] ?? null)) {
                continue;
            }

            $recitations = $this->recitations($entry);
            $index[$entry['id']] = [
                'text' => $recitations['texts'][0] ?? '',
                'times' => $recitations['times'],
            ];
        }

        return $index;
    }

    /**
     * The recitation texts of an entry, in order, and the count of its single item when there is exactly one.
     *
     * @param  array<string, mixed>  $entry
     * @return array{texts: list<string>, times: int|null}
     */
    private function recitations(array $entry): array
    {
        $texts = [];
        $times = [];
        $variations = is_array($entry['variations'] ?? null) ? $entry['variations'] : [['steps' => $entry['steps'] ?? []]];

        foreach ($variations as $variation) {
            foreach (is_array($variation) && is_array($variation['steps'] ?? null) ? $variation['steps'] : [] as $step) {
                if (! is_array($step) || ($step['type'] ?? null) !== 'recitation') {
                    continue;
                }

                foreach (is_array($step['items'] ?? null) ? $step['items'] : [] as $item) {
                    $dua = is_array($item) ? ($item['dua'] ?? null) : null;

                    if (is_array($dua) && is_string($dua['arabic'] ?? null)) {
                        $texts[] = $dua['arabic'];
                        $times[] = is_int($item['times'] ?? null) ? $item['times'] : null;
                    }
                }
            }
        }

        return [
            'texts' => $texts,
            'times' => count($times) === 1 ? $times[0] : null,
        ];
    }

    /**
     * Removes one wrapping pair of parentheses and the spaces inside them. Used for comparison only, never stored.
     */
    private function unwrap(string $text): string
    {
        $leading = preg_replace('/^[\(\s]+/u', '', trim($text)) ?? trim($text);

        return trim(preg_replace('/\s*\)+\s*\.?\s*$/u', '', $leading) ?? $leading);
    }

    /**
     * The first code point at which the two strings differ, or the length of the shorter when one is a prefix.
     */
    private function firstDifference(string $left, string $right): int
    {
        $a = mb_str_split($left);
        $b = mb_str_split($right);
        $count = min(count($a), count($b));

        for ($position = 0; $position < $count; $position++) {
            if ($a[$position] !== $b[$position]) {
                return $position;
            }
        }

        return $count;
    }
}
