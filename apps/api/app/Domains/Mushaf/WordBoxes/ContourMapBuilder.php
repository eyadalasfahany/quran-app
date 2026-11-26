<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\WordBoxes;

use App\Domains\Mushaf\Exceptions\SvgMushafSourceException;
use App\Domains\Mushaf\Records\ContourMap;

/**
 * Maps each word's contours to TQP subpaths and lays out the page's blocks, ayah marks, sajda lines and hizb ornaments (ADR 0090
 * step 13 A3). It never changes a word box: it only says which subpaths belong to which word. Pure: the caller passes the page data.
 *
 * Gates: W9 (ayah marks match the ayahs whose last word is on the page), W10 (every subpath is claimed once; a word's own
 * contours span its box), W11 (sajda lines: exactly 15 on 15 pages for Hafs; reported for the others).
 *
 * @phpstan-import-type Box from SvgPathBounds
 * @phpstan-import-type WordRow from ContourMap
 * @phpstan-import-type BlockRow from ContourMap
 * @phpstan-import-type Attachment from ContourMap
 *
 * @phpstan-type Word array{surah: int, ayah: int, position: int, apps: list<int>, line: int, contours: list<int>, x0: float, x1: float}
 * @phpstan-type Loose array{contour: int, loose: int, line: int, attach: string|null, ornament: bool}
 * @phpstan-type Mark array{first: int, count: int, box: Box}
 * @phpstan-type Region array{surah: int, ayah: int, polygon: string}
 * @phpstan-type PageInput array{contours: list<Box>, lineOf: list<int|null>, words: list<Word>, loose: list<Loose>, subpaths: int, content: list<int>, marks: list<Mark>, regions: list<Region>}
 * @phpstan-type LastWord array{page: int, box: Box}
 */
final class ContourMapBuilder
{
    /** Algorithm version in the contour digest. Bump it when a rule above changes what the rows say. */
    public const int ALGORITHM = 1;

    /** A sajda line is at most this high and at least this wide (page units; gate W11). */
    private const float SAJDA_MAX_HEIGHT = 1.5;

    private const float SAJDA_MIN_WIDTH = 33.0;

    private const int SAJDA_LINES = 15;

    private const float SCALE = 32.0;

    /**
     * @param  array<int, PageInput>  $pages
     * @param  array<string, LastWord>  $lastWords  "surah:ayah" => the page and box of the ayah's last word
     */
    public static function build(array $pages, array $lastWords, float $polygonSnap, float $lineHeight, bool $requireSajdaCount): ContourMap
    {
        $wordRows = [];
        $blockRows = [];
        $attachments = [];
        $issues = [];
        $checks = ['W9' => 0, 'W10' => 0, 'W11' => 0];
        $sajdaLines = 0;
        $sajdaPages = 0;
        $hizb = 0;

        foreach ($pages as $page => $input) {
            $result = self::page($page, $input, $lastWords, $polygonSnap, $lineHeight);
            array_push($wordRows, ...$result['words']);
            array_push($blockRows, ...$result['blocks']);
            array_push($attachments, ...$result['attachments']);
            array_push($issues, ...$result['issues']);
            $checks['W9'] += $result['checks']['W9'];
            $checks['W10'] += $result['checks']['W10'];
            $sajdaLines += $result['sajda'];
            $sajdaPages += $result['sajda'] > 0 ? 1 : 0;
            $hizb += $result['hizb'];
        }

        if ($requireSajdaCount && ($sajdaLines !== self::SAJDA_LINES || $sajdaPages !== self::SAJDA_LINES)) {
            $checks['W11'] = 1;
            $issues[] = sprintf('W11 sajda lines: %d lines on %d pages, Hafs needs 15 on 15', $sajdaLines, $sajdaPages);
        }

        usort($wordRows, fn (array $a, array $b): int => [$a['surah'], $a['ayah'], $a['position'], $a['first']] <=> [$b['surah'], $b['ayah'], $b['position'], $b['first']]);
        usort($blockRows, fn (array $a, array $b): int => [$a['page'], $a['kind'], $a['ord']] <=> [$b['page'], $b['kind'], $b['ord']]);

        return new ContourMap($wordRows, $blockRows, $checks, $issues, $attachments, $sajdaLines, $sajdaPages, $hizb);
    }

    /**
     * @param  PageInput  $input
     * @param  array<string, LastWord>  $lastWords
     * @return array{words: list<WordRow>, blocks: list<BlockRow>, attachments: list<Attachment>, issues: list<string>, checks: array{W9: int, W10: int}, sajda: int, hizb: int}
     *
     * @throws SvgMushafSourceException
     */
    private static function page(int $page, array $input, array $lastWords, float $polygonSnap, float $lineHeight): array
    {
        $contours = $input['contours'];

        if (count($input['content']) !== count($contours)) {
            throw new SvgMushafSourceException(sprintf('Page %d: the TQP subpath map has %d content contours, PageContours has %d.', $page, count($input['content']), count($contours)));
        }

        $issues = [];
        $w10 = 0;
        $claims = array_fill(0, $input['subpaths'], 0);
        $wordSubs = array_fill(0, count($input['words']), []);
        $wordBoxes = [];
        $blocks = [];
        $attachments = [];

        foreach ($input['words'] as $w => $word) {
            $box = null;

            foreach ($word['contours'] as $c) {
                $box = self::union($box, $contours[$c]);
                $wordSubs[$w][] = [$input['content'][$c], 0];
            }

            $wordBoxes[$w] = $box;

            if ($box === null || abs($box[0] - $word['x0']) > 0.01 || abs($box[2] - $word['x1']) > 0.01) {
                $w10++;
                $issues[] = sprintf('W10 page %d: word %s does not span its contours', $page, self::label($word));
            }
        }

        // Ornaments are blocks in the margin, anchored to the nearest word; the rest attach to a word.
        $hizb = 0;
        $ornamentOrd = 0;

        foreach ($input['loose'] as $loose) {
            $c = $loose['contour'];
            $sub = $input['content'][$c];

            if ($loose['ornament']) {
                $anchor = self::nearest($input['words'], $wordBoxes, $loose['line'], $contours[$c]);
                $hizb++;

                if ($anchor === null) {
                    $w10++;
                    $issues[] = sprintf('W10 page %d: hizb ornament %d has no word to anchor to', $page, $c);

                    continue;
                }

                $claims[$sub]++;
                $blocks[] = self::block($page, 4, $ornamentOrd++, $input['words'][$anchor]['surah'], $input['words'][$anchor]['ayah'], $sub, 1, $contours[$c]);

                continue;
            }

            if ($loose['attach'] !== null) {
                $target = self::byLabel($input['words'], $loose['attach']);
                $mode = 'explicit';
            } else {
                $target = self::nearest($input['words'], $wordBoxes, $loose['line'], $contours[$c]);
                $mode = 'nearest';
            }

            if ($target === null || $wordBoxes[$target] === null) {
                $w10++;
                $issues[] = sprintf('W10 page %d: loose contour %d (line %d) has no word to attach to', $page, $c, $loose['line']);

                continue;
            }

            $wordSubs[$target][] = [$sub, 1];
            $attachments[] = [
                'page' => $page, 'line' => $loose['line'], 'contour' => $c, 'loose' => $loose['loose'], 'target' => self::label($input['words'][$target]),
                'distance' => round(self::distance($wordBoxes[$target], $contours[$c]), 2), 'mode' => $mode,
                'box' => array_map(fn (float $v): float => round($v, 2), $contours[$c]),
            ];
        }

        foreach ($wordSubs as $subs) {
            foreach ($subs as [$sub]) {
                $claims[$sub]++;
            }
        }

        $words = [];

        foreach ($input['words'] as $w => $word) {
            foreach ([0, 1] as $flag) {
                $list = array_values(array_unique(array_map(static fn (array $s): int => $s[0], array_filter($wordSubs[$w], static fn (array $s): bool => $s[1] === $flag))));
                sort($list);

                foreach (self::runs($list) as $run) {
                    $words[] = ['surah' => $word['surah'], 'ayah' => $word['ayah'], 'position' => $word['apps'][0], 'first' => $run['first'], 'count' => $run['count'], 'flag' => $flag];
                }
            }
        }

        // Out-of-band contours: title, basmala and other full-line art, clustered top to bottom.
        $outside = [];

        foreach ($input['content'] as $c => $sub) {
            if (($input['lineOf'][$c] ?? null) === null) {
                $outside[] = $c;
            }
        }

        usort($outside, fn (int $a, int $b): int => [($contours[$a][1] + $contours[$a][3]) / 2, $a] <=> [($contours[$b][1] + $contours[$b][3]) / 2, $b]);
        $clusters = [];
        $bottom = null;

        foreach ($outside as $c) {
            $box = $contours[$c];

            if ($bottom !== null && $box[1] <= $bottom + 0.25 * $lineHeight) {
                $clusters[count($clusters) - 1]['members'][] = $c;
                $bottom = max($bottom, $box[3]);
            } else {
                $clusters[] = ['members' => [$c]];
                $bottom = $box[3];
            }
        }

        foreach ($clusters as $ord => $cluster) {
            $subs = array_map(fn (int $c): int => $input['content'][$c], $cluster['members']);
            sort($subs);
            $runs = self::runs($subs);

            if (count($runs) !== 1) {
                $w10++;
                $issues[] = sprintf('W10 page %d: block %d is not one run of subpaths', $page, $ord);

                continue;
            }

            $box = null;

            foreach ($cluster['members'] as $c) {
                $box = self::union($box, $contours[$c]);
            }

            foreach ($subs as $sub) {
                $claims[$sub]++;
            }

            $blocks[] = self::block($page, 1, $ord, 0, 0, $runs[0]['first'], $runs[0]['count'], $box);
        }

        // Ayah marks: each ayah whose last word is on this page gets exactly one ornament inside its rectangles.
        $onPage = [];

        foreach ($lastWords as $key => $last) {
            if ($last['page'] === $page) {
                $onPage[(string) $key] = $last;
            }
        }

        $rects = $input['regions'] === [] ? [] : LineBands::pageRects($input['regions'], $polygonSnap);
        $matched = array_fill_keys(array_keys($onPage), 0);
        $markIssues = 0;

        foreach ($input['marks'] as $ord => $mark) {
            $cx = ($mark['box'][0] + $mark['box'][2]) / 2;
            $cy = ($mark['box'][1] + $mark['box'][3]) / 2;
            $best = null;
            $bestDistance = INF;

            foreach ($onPage as $key => $last) {
                foreach ($rects[$key] ?? [] as $rect) {
                    if ($cx >= $rect[0] && $cx <= $rect[2] && $cy >= $rect[1] && $cy <= $rect[3]) {
                        $distance = self::distance($last['box'], [$cx, $cy, $cx, $cy]);

                        if ($distance < $bestDistance) {
                            $best = $key;
                            $bestDistance = $distance;
                        }

                        break;
                    }
                }
            }

            if ($best === null) {
                $markIssues++;
                $issues[] = sprintf('W9 page %d: ayah mark %d is inside no ayah of the page', $page, $ord);

                continue;
            }

            $matched[$best]++;
            [$surah, $ayah] = array_map(intval(...), explode(':', $best));
            foreach (range($mark['first'], $mark['first'] + $mark['count'] - 1) as $sub) {
                $claims[$sub]++;
            }

            $blocks[] = self::block($page, 2, $ord, $surah, $ayah, $mark['first'], $mark['count'], $mark['box']);
        }

        foreach ($matched as $key => $count) {
            if ($count !== 1) {
                $markIssues++;
                $issues[] = sprintf('W9 page %d: ayah %s has %d ornaments, not one', $page, $key, $count);
            }
        }

        if (count($input['marks']) !== count($onPage)) {
            $markIssues++;
            $issues[] = sprintf('W9 page %d: %d ayah marks for %d ayahs ending here', $page, count($input['marks']), count($onPage));
        }

        // Sajda lines: an annotation of the word that holds the line (its subpath is already claimed above).
        $sajda = 0;

        foreach ($contours as $c => $box) {
            if ($box[3] - $box[1] <= self::SAJDA_MAX_HEIGHT && $box[2] - $box[0] >= self::SAJDA_MIN_WIDTH) {
                $blocks[] = self::block($page, 3, $sajda++, 0, 0, $input['content'][$c], 1, $box);
            }
        }

        // Integrity: every subpath is claimed exactly once by a word run, a block, an ayah mark or an ornament.
        foreach ($claims as $sub => $count) {
            if ($count !== 1) {
                $w10++;
                $issues[] = sprintf('W10 page %d: subpath %d is claimed %d times', $page, $sub, $count);
            }
        }

        return [
            'words' => $words,
            'blocks' => $blocks,
            'attachments' => $attachments,
            'issues' => $issues,
            'checks' => ['W9' => $markIssues, 'W10' => $w10],
            'sajda' => $sajda,
            'hizb' => $hizb,
        ];
    }

    /**
     * The word on this line, the line above or the line below nearest to the contour: distance 0 when they overlap, ties to the
     * word on the right (the start of an Arabic line).
     *
     * @param  list<Word>  $words
     * @param  array<int, Box|null>  $wordBoxes
     * @param  Box  $box
     */
    private static function nearest(array $words, array $wordBoxes, int $line, array $box): ?int
    {
        $best = null;

        foreach ($words as $w => $word) {
            $wordBox = $wordBoxes[$w] ?? null;

            if ($wordBox === null || abs($word['line'] - $line) > 1) {
                continue;
            }

            $distance = self::distance($wordBox, $box);
            $centre = ($wordBox[0] + $wordBox[2]) / 2;

            if ($best === null || [$distance, -$centre, $w] < $best[1]) {
                $best = [$w, [$distance, -$centre, $w]];
            }
        }

        return $best === null ? null : $best[0];
    }

    /**
     * @param  list<Word>  $words
     */
    private static function byLabel(array $words, string $label): ?int
    {
        foreach ($words as $w => $word) {
            if (self::label($word) === $label) {
                return $w;
            }
        }

        return null;
    }

    /**
     * @param  Word  $word
     */
    private static function label(array $word): string
    {
        return $word['surah'].':'.$word['ayah'].':'.implode('+', $word['apps']);
    }

    /**
     * The gap between two boxes (0 when they overlap).
     *
     * @param  Box  $a
     * @param  Box  $b
     */
    private static function distance(array $a, array $b): float
    {
        $dx = max(0.0, $a[0] - $b[2], $b[0] - $a[2]);
        $dy = max(0.0, $a[1] - $b[3], $b[1] - $a[3]);

        return sqrt($dx * $dx + $dy * $dy);
    }

    /**
     * Consecutive runs of a sorted list of distinct integers.
     *
     * @param  list<int>  $values
     * @return list<array{first: int, count: int}>
     */
    private static function runs(array $values): array
    {
        $runs = [];

        foreach ($values as $value) {
            $last = array_key_last($runs);

            if ($last !== null && $runs[$last]['first'] + $runs[$last]['count'] === $value) {
                $runs[$last] = ['first' => $runs[$last]['first'], 'count' => $runs[$last]['count'] + 1];
            } else {
                $runs[] = ['first' => $value, 'count' => 1];
            }
        }

        return $runs;
    }

    /**
     * @param  Box|null  $current
     * @param  Box  $box
     * @return Box
     */
    private static function union(?array $current, array $box): array
    {
        return $current === null ? $box : [min($current[0], $box[0]), min($current[1], $box[1]), max($current[2], $box[2]), max($current[3], $box[3])];
    }

    /**
     * @param  Box  $box
     * @return BlockRow
     */
    private static function block(int $page, int $kind, int $ord, int $surah, int $ayah, int $first, int $count, array $box): array
    {
        return [
            'page' => $page, 'kind' => $kind, 'ord' => $ord, 'surah' => $surah, 'ayah' => $ayah, 'first' => $first, 'count' => $count,
            'x0' => (int) round($box[0] * self::SCALE), 'y0' => (int) round($box[1] * self::SCALE),
            'x1' => (int) round($box[2] * self::SCALE), 'y1' => (int) round($box[3] * self::SCALE),
        ];
    }
}
