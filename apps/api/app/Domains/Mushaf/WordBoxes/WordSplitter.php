<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\WordBoxes;

/**
 * Splits a line's contours, in path order, into one contiguous group per word (ADR 0090, the spike's `words7.py`). Path order
 * runs left to right, so group k is the k-th word from the left, which is reverse reading order. The dynamic program minimises
 * the sum over groups of: the group's width, plus a penalty when no contour in it is full height, plus a penalty when its x-centre
 * is outside its word's span, plus (when bodies are given) a penalty for each full-height contour more or fewer than the word's text
 * has letter bodies, so a detached letter goes with its own word rather than the nearer neighbour.
 *
 * @phpstan-import-type Box from SvgPathBounds
 */
final class WordSplitter
{
    /**
     * @param  list<Box>  $contours  the line's contours in path order
     * @param  list<array{0: float, 1: float}|null>  $spans  each word's allowed x-range, left to right; null when it has none
     * @param  list<bool>  $base  whether each contour is full height
     * @param  list<int>|null  $bodies  each word's letter-body count from its text, left to right; null leaves the count out
     * @param  list<bool>|null  $isBody  whether each contour counts as a letter body; null counts the full-height ones
     * @param  float  $contourSpanPenalty  cost per contour whose own centre is outside its word's span (0 checks only the group's
     *                                     centre): a contour drawn in one ayah's region cannot belong to a word of another
     * @return list<array{0: int, 1: int}>|null [start, end) contour indexes per group, left to right; null with fewer contours than words
     */
    public static function split(array $contours, array $spans, array $base, float $tolerance, float $noBasePenalty, float $outOfSpanPenalty, ?array $bodies = null, float $bodyPenalty = 0.0, ?array $isBody = null, float $contourSpanPenalty = 0.0): ?array
    {
        $m = count($contours);
        $isBody ??= $base;
        $n = count($spans);

        if ($n === 0 || $m < $n) {
            return null;
        }

        $best = array_fill(0, $n + 1, array_fill(0, $m + 1, INF));
        $back = array_fill(0, $n + 1, array_fill(0, $m + 1, 0));
        $best[0][0] = 0.0;

        for ($k = 1; $k <= $n; $k++) {
            $span = $spans[$k - 1];
            // Every later group needs at least one contour, so a group never ends past $last.
            $last = $m - ($n - $k) - 1;

            for ($i = $k - 1; $i <= $last; $i++) {
                if ($best[$k - 1][$i] === INF) {
                    continue;
                }

                $lo = INF;
                $hi = -INF;
                $has = false;
                $tall = 0;
                $outside = 0;

                for ($j = $i; $j <= $last; $j++) {
                    $lo = min($lo, $contours[$j][0]);
                    $hi = max($hi, $contours[$j][2]);
                    $has = $has || $base[$j];
                    $tall += $isBody[$j] ? 1 : 0;
                    $own = ($contours[$j][0] + $contours[$j][2]) / 2;
                    $outside += $span !== null && ($own < $span[0] - $tolerance || $own > $span[1] + $tolerance) ? 1 : 0;
                    $cost = ($hi - $lo) + ($has ? 0.0 : $noBasePenalty);

                    $cost += $contourSpanPenalty * $outside;

                    if ($bodies !== null && $bodyPenalty > 0.0) {
                        $cost += $bodyPenalty * abs($tall - $bodies[$k - 1]);
                    }
                    $centre = ($lo + $hi) / 2;

                    if ($span === null || $centre < $span[0] - $tolerance || $centre > $span[1] + $tolerance) {
                        $cost += $outOfSpanPenalty;
                    }

                    $value = $best[$k - 1][$i] + $cost;

                    if ($value < $best[$k][$j + 1]) {
                        $best[$k][$j + 1] = $value;
                        $back[$k][$j + 1] = $i;
                    }
                }
            }
        }

        $groups = [];
        $j = $m;

        for ($k = $n; $k >= 1; $k--) {
            $i = $back[$k][$j];
            $groups[] = [$i, $j];
            $j = $i;
        }

        return array_reverse($groups);
    }
}
