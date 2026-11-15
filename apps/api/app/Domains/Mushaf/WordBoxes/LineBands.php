<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\WordBoxes;

use App\Domains\Mushaf\Exceptions\SvgMushafSourceException;

/**
 * A page's text lines and each ayah's per-line rectangles, from its ayah polygons (ADR 0090, the spike's `words3.py`).
 *
 * - A polygon is rectangles in SVG path data (`M x y L x y L x y L x y Z`, repeated), or, on pages 1-2, a bare list of `x,y`
 *   pairs. A bare polygon is cut into rectangles at the page's line edges: the y of every bare corner on the page, where corners
 *   closer than `polygon_snap` count as one edge.
 * - `H` is one line height for the whole edition (lineHeight()); each rectangle is split into round(height / H) equal bands.
 * - The page's lines are the distinct bands, top to bottom; a band that overlaps the previous one by more than 0.5 is merged
 *   into it.
 *
 * @phpstan-import-type Box from SvgPathBounds
 */
final readonly class LineBands
{
    private const string NUMBER = '/[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/';

    private const float MERGE_OVERLAP = 0.5;

    /**
     * @param  list<array{0: float, 1: float}>  $bands  y0, y1 of each text line, top to bottom
     * @param  array<string, list<Box>>  $rects  "surah:ayah" => the ayah's rectangles after the band split
     */
    private function __construct(public array $bands, public array $rects) {}

    /**
     * @param  list<array{surah: int, ayah: int, polygon: string}>  $regions
     *
     * @throws SvgMushafSourceException
     */
    public static function fromRegions(array $regions, float $polygonSnap, float $lineHeight): self
    {
        $h = $lineHeight;
        $rects = [];
        $edges = [];

        foreach (self::pageRects($regions, $polygonSnap) as $key => $list) {
            foreach ($list as [$x0, $y0, $x1, $y1]) {
                $k = $h > 0.0 ? max(1, (int) round(($y1 - $y0) / $h)) : 1;

                for ($j = 0; $j < $k; $j++) {
                    $band = [$x0, $y0 + ($y1 - $y0) * $j / $k, $x1, $y0 + ($y1 - $y0) * ($j + 1) / $k];
                    $rects[$key][] = $band;
                    $edges[] = [round($band[1], 1), round($band[3], 1)];
                }
            }
        }

        sort($edges);
        $bands = [];

        foreach ($edges as [$y0, $y1]) {
            $last = $bands[count($bands) - 1] ?? null;

            if ($last === null || $y0 >= $last[1] - self::MERGE_OVERLAP) {
                $bands[] = [$y0, $y1];
            }
        }

        return new self($bands, $rects);
    }

    /**
     * The page's rectangles before the band split, "surah:ayah" => rectangles.
     *
     * @param  list<array{surah: int, ayah: int, polygon: string}>  $regions
     * @return array<string, list<Box>>
     *
     * @throws SvgMushafSourceException
     */
    public static function pageRects(array $regions, float $polygonSnap): array
    {
        $bare = [];

        foreach ($regions as $region) {
            if (! self::isPathData($region['polygon'])) {
                $bare[] = $region['polygon'];
            }
        }

        $levels = $bare === [] ? [] : self::levels($bare, $polygonSnap);
        $byAyah = [];

        foreach ($regions as $region) {
            foreach (self::rects($region['polygon'], $levels) as $rect) {
                $byAyah[$region['surah'].':'.$region['ayah']][] = $rect;
            }
        }

        return $byAyah;
    }

    /**
     * One line height for an edition: the median height of its single-line rectangles, those under 1.5 times the 25th
     * percentile of all rectangle heights (the heights cluster at one, two, three lines and so on).
     *
     * @param  list<float>  $heights  every rectangle height of every page
     */
    public static function lineHeight(array $heights): float
    {
        if ($heights === []) {
            return 0.0;
        }

        sort($heights);
        $limit = 1.5 * $heights[intdiv(count($heights), 4)];
        $single = array_values(array_filter($heights, fn (float $h): bool => $h < $limit));
        $middle = intdiv(count($single), 2);

        return count($single) % 2 === 1 ? $single[$middle] : ($single[$middle - 1] + $single[$middle]) / 2;
    }

    /**
     * The index of the first band holding $y, or null.
     */
    public function bandAt(float $y): ?int
    {
        foreach ($this->bands as $index => [$y0, $y1]) {
            if ($y0 <= $y && $y < $y1) {
                return $index;
            }
        }

        return null;
    }

    /**
     * The ayah's x-range on the line through $y: the extent of its rectangles that cover $y within $tolerance, or null.
     *
     * @return array{0: float, 1: float}|null
     */
    public function span(int $surah, int $ayah, float $y, float $tolerance): ?array
    {
        $x0 = INF;
        $x1 = -INF;

        foreach ($this->rects[$surah.':'.$ayah] ?? [] as $rect) {
            if ($y >= $rect[1] - $tolerance && $y <= $rect[3] + $tolerance) {
                $x0 = min($x0, $rect[0]);
                $x1 = max($x1, $rect[2]);
            }
        }

        return $x0 === INF ? null : [$x0, $x1];
    }

    /**
     * One polygon's rectangles, before the band split.
     *
     * @param  list<float>  $levels  the page's line edges for bare polygons
     * @return list<Box>
     *
     * @throws SvgMushafSourceException
     */
    public static function rects(string $polygon, array $levels): array
    {
        $numbers = self::numbers($polygon);

        if (self::isPathData($polygon)) {
            if ($numbers === [] || count($numbers) % 8 !== 0) {
                throw new SvgMushafSourceException('An ayah polygon is not a list of rectangles.');
            }

            $rects = [];

            foreach (array_chunk($numbers, 8) as $c) {
                $rects[] = [min($c[0], $c[2], $c[4], $c[6]), min($c[1], $c[3], $c[5], $c[7]), max($c[0], $c[2], $c[4], $c[6]), max($c[1], $c[3], $c[5], $c[7])];
            }

            return $rects;
        }

        $points = self::points($numbers);
        $rects = [];
        $count = count($points);

        for ($l = 1, $n = count($levels); $l < $n; $l++) {
            $a = $levels[$l - 1];
            $b = $levels[$l];
            $y = ($a + $b) / 2;
            $xs = [];

            for ($p = 0; $p < $count; $p++) {
                [$x1, $y1] = $points[$p];
                [$x2, $y2] = $points[($p + 1) % $count];

                if (($y1 <= $y) !== ($y2 <= $y)) {
                    $xs[] = $x1 + ($y - $y1) * ($x2 - $x1) / ($y2 - $y1);
                }
            }

            sort($xs);

            for ($k = 0; $k + 1 < count($xs); $k += 2) {
                $rects[] = [$xs[$k], $a, $xs[$k + 1], $b];
            }
        }

        return $rects;
    }

    /**
     * The line edges of bare polygons: their corner ys, clustered when closer than $snap, each cluster at its middle.
     *
     * @param  list<string>  $polygons
     * @return list<float>
     *
     * @throws SvgMushafSourceException
     */
    public static function levels(array $polygons, float $snap): array
    {
        $ys = [];

        foreach ($polygons as $polygon) {
            foreach (self::points(self::numbers($polygon)) as [, $y]) {
                $ys[] = $y;
            }
        }

        sort($ys);
        $levels = [];
        $first = $last = null;

        foreach ($ys as $y) {
            if ($last !== null && $y - $last > $snap) {
                $levels[] = ($first + $last) / 2;
                $first = null;
            }

            $first ??= $y;
            $last = $y;
        }

        if ($first !== null) {
            $levels[] = ($first + $last) / 2;
        }

        return $levels;
    }

    private static function isPathData(string $polygon): bool
    {
        return str_starts_with(ltrim($polygon), 'M');
    }

    /**
     * @return list<float>
     */
    private static function numbers(string $polygon): array
    {
        preg_match_all(self::NUMBER, $polygon, $matches);

        return array_map(floatval(...), $matches[0]);
    }

    /**
     * @param  list<float>  $numbers
     * @return list<array{0: float, 1: float}>
     *
     * @throws SvgMushafSourceException
     */
    private static function points(array $numbers): array
    {
        if (count($numbers) < 6 || count($numbers) % 2 !== 0) {
            throw new SvgMushafSourceException('An ayah polygon is not a list of x,y pairs.');
        }

        $points = [];

        for ($i = 0; $i < count($numbers); $i += 2) {
            $points[] = [$numbers[$i], $numbers[$i + 1]];
        }

        return $points;
    }
}
