<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Packs\Tqp;

use App\Domains\Mushaf\Exceptions\SvgMushafSourceException;
use App\Domains\Mushaf\Exceptions\TqpEncodeException;
use App\Domains\Mushaf\WordBoxes\PageContours;
use App\Domains\Mushaf\WordBoxes\SvgPathBounds;

/**
 * @phpstan-import-type TqpPiece from TqpPageScope
 *
 * Numbers the subpaths of a page's TQP1 stream and says which of them are the content contours of PageContours (ADR 0090 step 13
 * A2). A subpath is one `M` in the encoded stream; the numbering runs over the pieces in document order, ayah marks first, as the
 * encoder writes them. A content contour is a subpath that draws (`L`, `Q`, `C`) before its next `M`, `Z` or the end of its piece:
 * the rule of SvgPathBounds::contours. Every piece is checked against that rule, so a drift throws rather than shifting indexes.
 *
 * @phpstan-type Mark array{first: int, count: int, box: array{0: float, 1: float, 2: float, 3: float}}
 */
final class TqpSubpaths
{
    public function __construct(private readonly TqpPathParser $paths = new TqpPathParser) {}

    /**
     * @return array{content: list<int>, marks: list<Mark>, subpaths: int, empty: list<int>} content[c] is the subpath of the c-th
     *                                                                                       content contour (PageContours' index);
     *                                                                                       marks are the ayah-mark groups in order;
     *                                                                                       empty are content subpaths that draw
     *                                                                                       nothing (a moveto with no drawing)
     *
     * @throws SvgMushafSourceException
     */
    public function map(string $svg, int $page): array
    {
        $scope = new TqpPageScope;

        try {
            $pieces = $scope->pieces($svg);
            [$originX, $originY] = $scope->viewBoxOrigin($svg);
        } catch (TqpEncodeException $exception) {
            throw new SvgMushafSourceException(sprintf('Page %d: %s', $page, $exception->getMessage()), previous: $exception);
        }

        $counter = 0;
        $content = [];
        $empty = [];
        $markFirst = [];
        $markCount = [];
        $markBox = [];
        $seenGroups = [];
        $openGroup = null;

        foreach ($pieces as $piece) {
            $start = $counter;
            $subpaths = $this->pieceSubpaths($piece['d'], $page, $counter);

            if (count($subpaths['contours']) !== count(SvgPathBounds::contours($piece['d']))) {
                throw new SvgMushafSourceException(sprintf('Page %d: the TQP subpath count and SvgPathBounds disagree for a path.', $page));
            }

            $counter = $subpaths['counter'];

            if ($piece['section'] === 'content') {
                array_push($content, ...$subpaths['contours']);
                if ($counter > $start) {
                    array_push($empty, ...array_values(array_diff(range($start, $counter - 1), $subpaths['contours'])));
                }
                $openGroup = null;

                continue;
            }

            $group = $piece['group'];

            if ($group === null) {
                throw new SvgMushafSourceException(sprintf('Page %d: an ayah ornament path has no group.', $page));
            }

            if ($group !== $openGroup) {
                if (isset($seenGroups[$group])) {
                    throw new SvgMushafSourceException(sprintf('Page %d: an ayah ornament group is split by another path.', $page));
                }

                $seenGroups[$group] = true;
                $markFirst[] = $start;
                $markCount[] = 0;
                $markBox[] = null;
                $openGroup = $group;
            }

            $last = count($markFirst) - 1;
            $markCount[$last] += $counter - $start;
            $markBox[$last] = $this->union($markBox[$last], $this->pieceBoxes($piece, $originX, $originY));
        }

        return [
            'content' => $content,
            'marks' => array_map(
                static fn (int $first, int $count, ?array $box): array => ['first' => $first, 'count' => $count, 'box' => $box ?? [0.0, 0.0, 0.0, 0.0]],
                $markFirst,
                $markCount,
                $markBox,
            ),
            'subpaths' => $counter,
            'empty' => $empty,
        ];
    }

    /**
     * @return array{contours: list<int>, counter: int}
     *
     * @throws SvgMushafSourceException
     */
    private function pieceSubpaths(string $d, int $page, int $counter): array
    {
        $open = null;
        $drawing = false;
        $closed = false;
        $drawn = [];

        foreach ($this->paths->segments($d) as [$command]) {
            if ($command === TqpCommand::M || $command === TqpCommand::Z) {
                if ($open !== null && $drawing) {
                    $drawn[] = $open;
                }

                $open = $command === TqpCommand::M ? $counter++ : null;
                $drawing = false;
                $closed = $command === TqpCommand::Z;

                continue;
            }

            if ($open === null || $closed) {
                throw new SvgMushafSourceException(sprintf('Page %d: a path draws after Z or before its first moveto; TQP has no subpath for it.', $page));
            }

            $drawing = true;
        }

        if ($open !== null && $drawing) {
            $drawn[] = $open;
        }

        return ['contours' => $drawn, 'counter' => $counter];
    }

    /**
     * The boxes of a marker piece's drawn subpaths, in the raw page space (the origin added back to the baked matrix).
     *
     * @param  TqpPiece  $piece
     * @return list<array{0: float, 1: float, 2: float, 3: float}>
     */
    private function pieceBoxes(array $piece, float $originX, float $originY): array
    {
        [$a, $b, $c, $d, $e, $f] = $piece['m'];
        $raw = [$a, $b, $c, $d, $e + $originX, $f + $originY];
        $boxes = [];

        foreach (SvgPathBounds::contours($piece['d']) as $box) {
            $boxes[] = PageContours::apply($raw, $box);
        }

        return $boxes;
    }

    /**
     * @param  array{0: float, 1: float, 2: float, 3: float}|null  $current
     * @param  list<array{0: float, 1: float, 2: float, 3: float}>  $boxes
     * @return array{0: float, 1: float, 2: float, 3: float}|null
     */
    private function union(?array $current, array $boxes): ?array
    {
        foreach ($boxes as $box) {
            $current = $current === null
                ? $box
                : [min($current[0], $box[0]), min($current[1], $box[1]), max($current[2], $box[2]), max($current[3], $box[3])];
        }

        return $current;
    }
}
