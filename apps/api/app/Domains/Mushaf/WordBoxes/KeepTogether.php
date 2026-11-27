<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\WordBoxes;

/**
 * Keep-together runs for the zoomed layout (ADR 0090 amendment item 14, developer: «the neighbouring words should be next to
 * each other whatever the case is»). The zoomed page re-wraps whole words; a word never loses a letter to its neighbour only
 * if neighbours whose letters interleave, or that share a drawn shape, move as one piece. The builder emits each run as a
 * contour_blocks row of kind 5, and the app's layout never breaks or spaces a run.
 */
final class KeepTogether
{
    /**
     * The runs of neighbouring words that the zoomed layout must keep on one line (ADR 0090, keep-together blocks). Two
     * neighbouring words of one ayah on one printed line join a run when a line break between them could show a letter on the
     * wrong side of its word: their letters interleave in print (a letter of the later word lies right of the earlier word's
     * leftmost letter), they share an unclear mark, one box lies mostly inside the other (at least half its width), one word has fewer letter bodies
     * than its text while the other has more, or one is too narrow for its letters with a missing body while the other is too
     * wide (the artwork draws them as one shape). Chained pairs make one run, in app positions.
     *
     * @param  list<array{line: int, surah: int, ayah: int, position: int, x0: float, y0: float, x1: float, y1: float}>  $boxes
     * @param  list<array{apps: list<int>}>  $wordContours  in the same order as the boxes
     * @param  array<int, float>  $perLetter
     * @param  list<array{text: int, drawn: int, centres: list<float>}>  $bodyCounts  in the same order as the boxes
     * @param  list<bool>  $sharedMarks  per box: it shares an unclear mark with the next box on its line
     * @return list<array{surah: int, ayah: int, first: int, count: int, box: array{0: float, 1: float, 2: float, 3: float}}>
     */
    public static function runs(array $boxes, array $wordContours, array $perLetter, float $median, array $bodyCounts, array $sharedMarks, float $narrow, float $wide): array
    {
        $ratio = fn (int $i): ?float => isset($perLetter[$i]) && $median > 0.0 ? $perLetter[$i] / $median : null;
        $joinedTo = [];

        for ($i = 0; $i + 1 < count($boxes); $i++) {
            $a = $boxes[$i];
            $b = $boxes[$i + 1];

            if ($a['line'] !== $b['line'] || $a['surah'] !== $b['surah'] || $a['ayah'] !== $b['ayah'] || abs($a['position'] - $b['position']) !== 1) {
                continue;
            }

            // Interleaved: in print the earlier word lies right of the later one, so any letter of the later word right of the
            // earlier word's leftmost letter sits among its letters. A line break or a gap between them would misplace it.
            [$earlier, $later] = $a['position'] < $b['position'] ? [$i, $i + 1] : [$i + 1, $i];
            $interleaved = $bodyCounts[$earlier]['centres'] !== [] && $bodyCounts[$later]['centres'] !== []
                && max($bodyCounts[$later]['centres']) > min($bodyCounts[$earlier]['centres']);
            // Mostly inside: one box overlaps the other by at least half its own width (a nested word, or the 1:1 letter box).
            $overlap = min($a['x1'], $b['x1']) - max($a['x0'], $b['x0']);
            $nested = $overlap >= 0.5 * min($a['x1'] - $a['x0'], $b['x1'] - $b['x0']);
            // One word misses a letter body and its neighbour has one too many: the letter is drawn with the neighbour.
            $swapped = ($bodyCounts[$i]['drawn'] < $bodyCounts[$i]['text'] && $bodyCounts[$i + 1]['drawn'] > $bodyCounts[$i + 1]['text'])
                || ($bodyCounts[$i]['drawn'] > $bodyCounts[$i]['text'] && $bodyCounts[$i + 1]['drawn'] < $bodyCounts[$i + 1]['text']);
            $joinedShape = false;

            foreach ([[$i, $i + 1], [$i + 1, $i]] as [$thin, $broad]) {
                $thinRatio = $ratio($thin);
                $broadRatio = $ratio($broad);
                $joinedShape = $joinedShape || ($thinRatio !== null && $broadRatio !== null && $thinRatio <= $narrow && $broadRatio >= $wide
                    && $bodyCounts[$thin]['drawn'] < $bodyCounts[$thin]['text']);
            }

            if ($interleaved || $nested || $swapped || $joinedShape || ($sharedMarks[$i] ?? false)) {
                $joinedTo[$i] = $i + 1;
            }
        }

        // Mostly inside, between any two words of one ayah on a line (not only neighbours): keep every word between them too.
        for ($i = 0; $i < count($boxes); $i++) {
            for ($j = $i + 2; $j < count($boxes); $j++) {
                $a = $boxes[$i];
                $b = $boxes[$j];

                if ($a['line'] !== $b['line'] || $a['surah'] !== $b['surah'] || $a['ayah'] !== $b['ayah']) {
                    break;
                }

                if (min($a['x1'], $b['x1']) - max($a['x0'], $b['x0']) >= 0.5 * min($a['x1'] - $a['x0'], $b['x1'] - $b['x0'])) {
                    for ($k = $i; $k < $j; $k++) {
                        $joinedTo[$k] = $k + 1;
                    }
                }
            }
        }

        $runs = [];

        foreach (array_keys($boxes) as $i) {
            if (! isset($joinedTo[$i]) || in_array($i, $joinedTo, true)) {
                continue;
            }

            $members = [$i];

            while (isset($joinedTo[$members[count($members) - 1]])) {
                $members[] = $joinedTo[$members[count($members) - 1]];
            }

            $apps = array_merge(...array_map(fn (int $m): array => $wordContours[$m]['apps'], $members));

            if ($apps === []) {
                continue;
            }

            $first = min($apps);
            $runs[] = [
                'surah' => $boxes[$i]['surah'], 'ayah' => $boxes[$i]['ayah'], 'first' => $first, 'count' => max($apps) - $first + 1,
                'box' => [
                    min(array_map(fn (int $m): float => $boxes[$m]['x0'], $members)), min(array_map(fn (int $m): float => $boxes[$m]['y0'], $members)),
                    max(array_map(fn (int $m): float => $boxes[$m]['x1'], $members)), max(array_map(fn (int $m): float => $boxes[$m]['y1'], $members)),
                ],
            ];
        }

        return $runs;
    }
}
