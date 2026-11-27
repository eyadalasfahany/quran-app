<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\WordBoxes;

use App\Domains\Mushaf\Exceptions\SvgMushafSourceException;
use DOMDocument;
use DOMElement;
use DOMXPath;

/**
 * The text contours of one page SVG in page coordinates (the viewBox space, y down), in document and path order. Only paths
 * under `<g id="content">` are text; the ayah-end ornaments under `ayah_markers` and the `ayahPolygon` paths are skipped. Each
 * path's transform chain (its own and every ancestor's, the root y-flipping matrix included) is applied.
 *
 * @phpstan-import-type Box from SvgPathBounds
 *
 * @phpstan-type Matrix array{0: float, 1: float, 2: float, 3: float, 4: float, 5: float}
 */
final class PageContours
{
    private const array IDENTITY = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0];

    /**
     * @return list<Box>
     *
     * @throws SvgMushafSourceException
     */
    public static function fromSvg(string $svg): array
    {
        $document = new DOMDocument;

        if ($svg === '' || ! @$document->loadXML($svg, LIBXML_NONET | LIBXML_COMPACT)) {
            throw new SvgMushafSourceException('A page SVG is not well-formed XML.');
        }

        $xpath = new DOMXPath($document);
        $content = $xpath->query('//*[@id="content"]');

        if ($content === false || $content->length !== 1 || ! $content->item(0) instanceof DOMElement) {
            throw new SvgMushafSourceException('A page SVG has no single <g id="content">.');
        }

        $paths = $xpath->query('.//*[local-name()="path"]', $content->item(0));
        $boxes = [];

        foreach ($paths === false ? [] : $paths as $path) {
            if (! $path instanceof DOMElement) {
                continue;
            }

            $matrix = self::chain($path);

            foreach (SvgPathBounds::contours($path->getAttribute('d')) as $box) {
                $boxes[] = self::apply($matrix, $box);
            }
        }

        return $boxes;
    }

    /**
     * Each content contour's outline points on the page, in the same order as fromSvg().
     *
     * @return list<list<array{0: float, 1: float}>>
     *
     * @throws SvgMushafSourceException
     */
    public static function pointsFromSvg(string $svg): array
    {
        $document = new DOMDocument;

        if ($svg === '' || ! @$document->loadXML($svg, LIBXML_NONET | LIBXML_COMPACT)) {
            throw new SvgMushafSourceException('A page SVG is not well-formed XML.');
        }

        $xpath = new DOMXPath($document);
        $content = $xpath->query('//*[@id="content"]');

        if ($content === false || $content->length !== 1 || ! $content->item(0) instanceof DOMElement) {
            throw new SvgMushafSourceException('A page SVG has no single <g id="content">.');
        }

        $paths = $xpath->query('.//*[local-name()="path"]', $content->item(0));
        $all = [];

        foreach ($paths === false ? [] : $paths as $path) {
            if (! $path instanceof DOMElement) {
                continue;
            }

            $m = self::chain($path);

            foreach (SvgPathBounds::points($path->getAttribute('d')) as $list) {
                $all[] = array_map(fn (array $p): array => [$m[0] * $p[0] + $m[2] * $p[1] + $m[4], $m[1] * $p[0] + $m[3] * $p[1] + $m[5]], $list);
            }
        }

        return $all;
    }

    /**
     * Parses a transform attribute: `matrix`, `translate` and `scale`, applied right to left as SVG does.
     *
     * @return Matrix
     *
     * @throws SvgMushafSourceException
     */
    public static function parseTransform(string $transform): array
    {
        $matrix = self::IDENTITY;
        $rest = trim(preg_replace('/(matrix|translate|scale)\s*\([^)]*\)/', '', $transform) ?? '', " \t\n\r,");

        if ($rest !== '') {
            throw new SvgMushafSourceException('Unsupported SVG transform ['.$transform.'].');
        }

        preg_match_all('/(matrix|translate|scale)\s*\(([^)]*)\)/', $transform, $parts, PREG_SET_ORDER);

        foreach ($parts as $part) {
            preg_match_all('/[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/', $part[2], $numbers);
            $n = array_map(floatval(...), $numbers[0]);

            $step = match ($part[1]) {
                'matrix' => count($n) === 6 ? [$n[0], $n[1], $n[2], $n[3], $n[4], $n[5]] : null,
                'translate' => count($n) === 1 || count($n) === 2 ? [1.0, 0.0, 0.0, 1.0, $n[0], $n[1] ?? 0.0] : null,
                default => count($n) === 1 || count($n) === 2 ? [$n[0], 0.0, 0.0, $n[1] ?? $n[0], 0.0, 0.0] : null,
            };

            if ($step === null) {
                throw new SvgMushafSourceException('Malformed SVG transform ['.$transform.'].');
            }

            $matrix = self::multiply($matrix, $step);
        }

        return $matrix;
    }

    /**
     * The page box of a local box: its four corners transformed, then bounded.
     * shortcut: exact for the scale-and-translate transforms the pages use; a rotation would give a slightly larger box.
     *
     * @param  Matrix  $m
     * @param  Box  $box
     * @return Box
     */
    public static function apply(array $m, array $box): array
    {
        $xs = [];
        $ys = [];

        foreach ([[$box[0], $box[1]], [$box[2], $box[1]], [$box[0], $box[3]], [$box[2], $box[3]]] as [$x, $y]) {
            $xs[] = $m[0] * $x + $m[2] * $y + $m[4];
            $ys[] = $m[1] * $x + $m[3] * $y + $m[5];
        }

        return [min($xs), min($ys), max($xs), max($ys)];
    }

    /**
     * The path's own transform and every ancestor's, outermost first.
     *
     * @return Matrix
     *
     * @throws SvgMushafSourceException
     */
    private static function chain(DOMElement $element): array
    {
        $matrix = self::IDENTITY;

        for ($node = $element; $node instanceof DOMElement; $node = $node->parentNode) {
            if ($node->hasAttribute('transform')) {
                $matrix = self::multiply(self::parseTransform($node->getAttribute('transform')), $matrix);
            }
        }

        return $matrix;
    }

    /**
     * @param  Matrix  $a
     * @param  Matrix  $b
     * @return Matrix a · b: b is applied first
     */
    private static function multiply(array $a, array $b): array
    {
        return [
            $a[0] * $b[0] + $a[2] * $b[1],
            $a[1] * $b[0] + $a[3] * $b[1],
            $a[0] * $b[2] + $a[2] * $b[3],
            $a[1] * $b[2] + $a[3] * $b[3],
            $a[0] * $b[4] + $a[2] * $b[5] + $a[4],
            $a[1] * $b[4] + $a[3] * $b[5] + $a[5],
        ];
    }
}
