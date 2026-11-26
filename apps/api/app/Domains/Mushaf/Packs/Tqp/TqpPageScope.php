<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Packs\Tqp;

use App\Domains\Mushaf\Exceptions\TqpEncodeException;
use DOMDocument;
use DOMElement;
use DOMNode;
use DOMXPath;

/**
 * The drawn paths of one page, as the app's parseSvgPage draws them (Part 0.1) and as `page_pieces` in tqp.py does: the page root
 * is the first `<g transform>` whose subtree holds #content or #ayah_markers; a path is drawn under #content, or under #ayah_markers
 * inside an ancestor `<g class="ayah-mark">`. The viewBox origin is baked into the matrix (the shift).
 *
 * Each piece also says its section (`content` or `markers`) and, under markers, its `ayah-mark` group (the ordinal of the outermost
 * `g.ayah-mark` above it, in document order), so TqpSubpaths can number subpaths and group ornaments (ADR 0090 step 13 A2).
 *
 * @phpstan-type TqpPiece array{d: string, m: list<float>, section: 'content'|'markers', group: int|null}
 */
final class TqpPageScope
{
    private const string SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

    private const string NUMBER = '[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?';

    private const float WIDTH = 345.0;

    private const float HEIGHT = 550.0;

    /**
     * @return list<TqpPiece>
     *
     * @throws TqpEncodeException
     */
    public function pieces(string $svg): array
    {
        $document = $this->load($svg);
        [$originX, $originY] = $this->viewBox($document);

        $shift = [1.0, 0.0, 0.0, 1.0, -$originX, -$originY];
        $rootGroup = $this->rootGroup($document);

        $pieces = [];
        $groups = 0;
        $this->walk($rootGroup, $shift, null, false, null, $groups, $pieces);

        return $pieces;
    }

    /**
     * The viewBox origin (min-x, min-y) of the raw page. TQP1 bakes it into the artwork; the pack keeps it for the regions and word boxes.
     *
     * @return array{0: float, 1: float}
     *
     * @throws TqpEncodeException
     */
    public function viewBoxOrigin(string $svg): array
    {
        return $this->viewBox($this->load($svg));
    }

    /**
     * @return array{0: float, 1: float}
     *
     * @throws TqpEncodeException
     */
    private function viewBox(DOMDocument $document): array
    {
        $root = $document->documentElement;
        $viewBox = preg_split('/\s+/', trim((string) $root?->getAttribute('viewBox')), -1, PREG_SPLIT_NO_EMPTY) ?: [];

        if (count($viewBox) !== 4 || ! is_numeric($viewBox[0]) || ! is_numeric($viewBox[1])
            || (float) $viewBox[2] !== self::WIDTH || (float) $viewBox[3] !== self::HEIGHT) {
            throw new TqpEncodeException('The page viewBox is not 345 × 550.');
        }

        return [(float) $viewBox[0], (float) $viewBox[1]];
    }

    /**
     * @param  list<float>  $matrix  The parent's matrix (a, b, c, d, e, f).
     * @param  list<TqpPiece>  $pieces
     *
     * @throws TqpEncodeException
     */
    private function walk(DOMElement $element, array $matrix, ?string $section, bool $mark, ?int $group, int &$groups, array &$pieces): void
    {
        if ($this->isSvg($element, 'g')) {
            $matrix = $this->multiply($matrix, $this->transform($element->getAttribute('transform')));
            $id = $element->getAttribute('id');

            if ($id === 'ayah_markers') {
                $section = 'markers';
            } elseif ($id === 'content') {
                $section = 'content';
            }

            $isMark = in_array('ayah-mark', preg_split('/\s+/', trim($element->getAttribute('class'))) ?: [], true);

            if ($isMark && ! $mark) {
                $group = ++$groups;
            }

            $mark = $mark || $isMark;
        }

        if ($this->isSvg($element, 'path') && $element->hasAttribute('d')
            && ($section === 'content' || ($section === 'markers' && $mark))) {
            $pieces[] = ['d' => $element->getAttribute('d'), 'm' => $matrix, 'section' => $section, 'group' => $section === 'markers' ? $group : null];
        }

        foreach ($element->childNodes as $child) {
            if ($child instanceof DOMElement) {
                $this->walk($child, $matrix, $section, $mark, $group, $groups, $pieces);
            }
        }
    }

    /**
     * @throws TqpEncodeException
     */
    private function rootGroup(DOMDocument $document): DOMElement
    {
        $xpath = new DOMXPath($document);

        foreach ($document->getElementsByTagNameNS(self::SVG_NAMESPACE, 'g') as $group) {
            if (! $group->hasAttribute('transform')) {
                continue;
            }

            $holders = $xpath->query('descendant-or-self::*[@id="content" or @id="ayah_markers"]', $group);

            if ($holders !== false && $holders->length > 0) {
                return $group;
            }
        }

        throw new TqpEncodeException('The page has no transformed group holding #content or #ayah_markers.');
    }

    /**
     * @throws TqpEncodeException
     */
    private function load(string $svg): DOMDocument
    {
        $document = new DOMDocument;
        $previous = libxml_use_internal_errors(true);

        try {
            $loaded = $document->loadXML($svg, LIBXML_NONET);
        } finally {
            libxml_clear_errors();
            libxml_use_internal_errors($previous);
        }

        if ($loaded !== true || $document->documentElement === null) {
            throw new TqpEncodeException('The page is not well-formed XML.');
        }

        return $document;
    }

    private function isSvg(DOMNode $node, string $localName): bool
    {
        return $node instanceof DOMElement
            && $node->namespaceURI === self::SVG_NAMESPACE
            && $node->localName === $localName;
    }

    /**
     * The transform list as `parse_transform` in tqp.py: translate, scale and matrix, applied left to right.
     *
     * @return list<float>
     *
     * @throws TqpEncodeException for any other function, or for a malformed argument list
     */
    private function transform(string $value): array
    {
        $matrix = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0];

        if (trim($value) === '') {
            return $matrix;
        }

        $rest = preg_replace('/(\w+)\s*\(([^)]*)\)/', '', $value);

        if (trim((string) $rest) !== '' || preg_match_all('/(\w+)\s*\(([^)]*)\)/', $value, $calls, PREG_SET_ORDER) === 0) {
            throw new TqpEncodeException('The transform ['.$value.'] is not a list of translate, scale or matrix.');
        }

        foreach ($calls as $call) {
            preg_match_all('/'.self::NUMBER.'/', $call[2], $numbers);
            $values = array_map(floatval(...), $numbers[0]);
            $count = count($values);

            $step = match ($call[1]) {
                'matrix' => $count === 6 ? $values : null,
                'translate' => $count === 1 || $count === 2 ? [1.0, 0.0, 0.0, 1.0, $values[0], $values[1] ?? 0.0] : null,
                'scale' => $count === 1 || $count === 2 ? [$values[0], 0.0, 0.0, $values[1] ?? $values[0], 0.0, 0.0] : null,
                default => null,
            };

            if ($step === null) {
                throw new TqpEncodeException('The transform ['.$call[1].'] is unsupported or has the wrong arguments.');
            }

            $matrix = $this->multiply($matrix, $step);
        }

        return $matrix;
    }

    /**
     * `mul(p, q)` of tqp.py, with the same operand order.
     *
     * @param  list<float>  $p
     * @param  list<float>  $q
     * @return list<float>
     */
    private function multiply(array $p, array $q): array
    {
        [$a, $b, $c, $d, $e, $f] = $p;
        [$pa, $pb, $pc, $pd, $pe, $pf] = $q;

        return [
            $a * $pa + $c * $pb,
            $b * $pa + $d * $pb,
            $a * $pc + $c * $pd,
            $b * $pc + $d * $pd,
            $a * $pe + $c * $pf + $e,
            $b * $pe + $d * $pf + $f,
        ];
    }
}
