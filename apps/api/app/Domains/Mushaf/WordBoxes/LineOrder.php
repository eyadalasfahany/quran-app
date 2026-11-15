<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\WordBoxes;

/**
 * Puts a line's contours in left-to-right order without losing the path's grouping by word (ADR 0090).
 *
 * 1. A line whose path runs right to left (its x-centres fall with path order) is reversed.
 * 2. The path is cut into runs wherever a contour's x-centre falls back by more than `jump`: a stray contour drawn out of
 *    place starts a run of its own.
 * 3. The runs are merged by left edge, each keeping its own path order, so a stray lands where its x puts it.
 *
 * The result is contiguous when no left edge then falls back by more than `jump`.
 *
 * @phpstan-import-type Box from SvgPathBounds
 */
final class LineOrder
{
    /**
     * @param  list<Box>  $contours  in path order
     * @return array{contours: list<Box>, reversed: bool, contiguous: bool}
     */
    public static function normalise(array $contours, float $jump): array
    {
        $n = count($contours);

        if ($n < 2) {
            return ['contours' => $contours, 'reversed' => false, 'contiguous' => true];
        }

        $centres = array_map(fn (array $c): float => ($c[0] + $c[2]) / 2, $contours);
        $meanIndex = ($n - 1) / 2;
        $meanCentre = array_sum($centres) / $n;
        $covariance = 0.0;

        foreach ($centres as $i => $x) {
            $covariance += ($i - $meanIndex) * ($x - $meanCentre);
        }

        $reversed = $covariance < 0.0;

        if ($reversed) {
            $contours = array_reverse($contours);
        }

        $runs = [[$contours[0]]];

        for ($i = 1; $i < $n; $i++) {
            $previous = ($contours[$i - 1][0] + $contours[$i - 1][2]) / 2;

            if (($contours[$i][0] + $contours[$i][2]) / 2 < $previous - $jump) {
                $runs[] = [];
            }

            $runs[count($runs) - 1][] = $contours[$i];
        }

        $heads = array_fill(0, count($runs), 0);
        $ordered = [];

        while (count($ordered) < $n) {
            $pick = null;

            foreach ($runs as $r => $run) {
                if ($heads[$r] < count($run) && ($pick === null || $run[$heads[$r]][0] < $runs[$pick][$heads[$pick]][0])) {
                    $pick = $r;
                }
            }

            $ordered[] = $runs[(int) $pick][$heads[(int) $pick]++];
        }

        $contiguous = true;

        for ($i = 1; $i < $n; $i++) {
            if ($ordered[$i][0] < $ordered[$i - 1][0] - $jump) {
                $contiguous = false;

                break;
            }
        }

        return ['contours' => $ordered, 'reversed' => $reversed, 'contiguous' => $contiguous];
    }
}
