<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Services;

use App\Domains\Mushaf\Exceptions\SvgMushafSourceException;
use App\Domains\Mushaf\Records\WordBoxBuild;
use App\Domains\Mushaf\Sources\SvgMushafDownloader;
use Illuminate\Support\Facades\File;
use Random\Engine\Mt19937;
use Random\Randomizer;

/**
 * Writes the local word-box review sheet (ADR 0090 decision 6, W7): every page with a W2, W4, W5 or W8 issue, an override or a
 * line left to the developer, plus a seeded random sample of pages with no issue at all. The index opens with what the
 * developer reviews: every override with its reason, the lines left to the developer and the sampled pages, each linked. Each page shows its artwork with the boxes drawn on top
 * and a table of word keys, widths and contour indices. On every flagged line each contour is outlined with its index in the
 * normalized line order, which is what an override in `word-box-overrides-{key}.json` names. Keys and numbers only, never
 * Quran text. The sheet is never committed or served.
 */
final class WordBoxReviewSheet
{
    private const array LISTED_CHECKS = ['W2', 'W4', 'W5', 'W8', 'override applied', 'override refused'];

    private const array HUES = [210, 30, 140, 280];

    public function __construct(private readonly SvgMushafDownloader $downloader) {}

    /**
     * @return array{flagged: int, sampled: int} how many pages were listed for each reason
     *
     * @throws SvgMushafSourceException
     */
    public function write(WordBoxBuild $build, string $directory, int $sample): array
    {
        $flagged = [];
        $clean = [];
        $reviewPages = array_map(fn (string $lineKey): int => (int) explode(':', $lineKey)[0], [...array_keys($build->overrides), ...array_keys($build->needsDeveloper)]);
        $reviewPages = [...$reviewPages, ...array_column($build->wordLines, 'page')];

        for ($page = 1; $page <= $build->pages; $page++) {
            $checks = $build->pageChecks[$page] ?? [];

            if (array_intersect($checks, self::LISTED_CHECKS) !== [] || in_array($page, $reviewPages, true)) {
                $flagged[] = $page;
            } elseif ($checks === []) {
                $clean[] = $page;
            }
        }

        // Seeded by the digest, so a re-run of the same build lists the same pages.
        $randomizer = new Randomizer(new Mt19937((int) hexdec(substr($build->digest, 0, 8))));
        $sampled = $clean === [] || $sample <= 0
            ? []
            : array_map(fn (int $index): int => $clean[$index], $randomizer->pickArrayKeys($clean, min($sample, count($clean))));

        $listed = array_merge($flagged, $sampled);
        sort($listed);

        File::ensureDirectoryExists($directory);
        $folder = (string) config('mushaf.editions.'.$build->key.'.folder');

        foreach ($listed as $page) {
            $svg = $this->downloader->bytes($folder, sprintf('svg/%03d.svg', $page), true);
            File::put($directory.'/'.self::fileName($page), $this->pageHtml($build, $page, $svg, in_array($page, $sampled, true)));
        }

        File::put($directory.'/index.html', $this->indexHtml($build, $listed, $sampled));

        return ['flagged' => count($flagged), 'sampled' => count($sampled)];
    }

    private function pageHtml(WordBoxBuild $build, int $page, string $svg, bool $sampled): string
    {
        $boxes = $build->pageBoxes[$page] ?? [];
        $overlay = '';
        $rows = '';

        foreach ($build->flaggedLines[$page] ?? [] as $contours) {
            foreach ($contours as $index => $c) {
                $overlay .= sprintf(
                    '<rect x="%.2f" y="%.2f" width="%.2f" height="%.2f" fill="none" stroke="#0a7" stroke-width="0.15"/><text x="%.2f" y="%.2f" font-size="2.2" fill="#0a7">%d</text>',
                    $c[0], $c[1], $c[2] - $c[0], $c[3] - $c[1], $c[0], $c[3] + 2.2, $index,
                );
            }
        }

        $lines = '';

        foreach ($build->flaggedLines[$page] ?? [] as $line => $contours) {
            $lines .= '<li>line '.$line.': '.count($contours).' contours</li>';
        }

        $anchored = [];

        foreach ($boxes as $index => $box) {
            $key = $box['label'];
            $hue = self::HUES[$index % count(self::HUES)];
            $flagged = $box['flags'] !== [];
            $overlay .= sprintf(
                '<rect x="%.2f" y="%.2f" width="%.2f" height="%.2f" fill="hsla(%d,80%%,55%%,0.25)" stroke="%s" stroke-width="%s"><title>%s</title></rect>',
                $box['x0'], $box['y0'], $box['x1'] - $box['x0'], $box['y1'] - $box['y0'], $hue,
                $flagged ? 'red' : sprintf('hsl(%d,80%%,35%%)', $hue), $flagged ? '1.2' : '0.3', $key,
            );
            // The index links to a line through the id on its first row.
            $rows .= sprintf(
                '<tr%s%s><td>%d</td><td>%s</td><td>%.2f</td><td>%s</td><td>%s</td></tr>',
                isset($anchored[$box['line']]) ? '' : ' id="line-'.$box['line'].'"', $flagged ? ' class="flag"' : '', $box['line'], $key, $box['x1'] - $box['x0'], implode(' ', $box['flags']),
                isset($build->flaggedLines[$page][$box['line']]) ? implode(',', $box['contours']) : '',
            );
            $anchored[$box['line']] = true;
        }

        $start = strpos($svg, '<svg');
        $end = strrpos($svg, '</svg>');
        $body = $start === false || $end === false ? '' : substr($svg, $start, $end - $start).'<g id="word-boxes">'.$overlay.'</g></svg>';
        $why = $sampled ? 'random sample (nothing flagged)' : 'checks: '.implode(', ', $build->pageChecks[$page] ?? []);

        return '<!doctype html><html lang="en"><meta charset="utf-8"><title>Word boxes, page '.$page.'</title>'
            .'<style>body{font:14px system-ui;margin:16px;display:flex;gap:24px;align-items:flex-start}'
            .'.page svg{width:690px;height:1100px;border:1px solid #ccc;background:#fff}'
            .'table{border-collapse:collapse}td,th{border:1px solid #ddd;padding:2px 8px;font-variant-numeric:tabular-nums}'
            .'tr.flag td{background:#fdd}</style>'
            .'<div class="page">'.$body.'</div>'
            .'<div><p><a href="index.html">All pages</a> · page '.$page.' · '.e($why).'</p>'
            .($lines === '' ? '' : '<p>Flagged lines (contours numbered in green, left to right after reordering):</p><ul>'.$lines.'</ul>')
            .'<table><tr><th>Line</th><th>Word (surah:ayah:position)</th><th>Width</th><th>Flags</th><th>Contours</th></tr>'.$rows.'</table></div></html>';
    }

    /**
     * @param  list<int>  $listed
     * @param  list<int>  $sampled
     */
    private function indexHtml(WordBoxBuild $build, array $listed, array $sampled): string
    {
        $counts = '';

        foreach ($build->counts as $check => $count) {
            $counts .= '<tr><td>'.e($check).'</td><td>'.$count.'</td></tr>';
        }

        $links = '';

        foreach ($listed as $page) {
            $why = in_array($page, $sampled, true) ? 'random sample' : implode(', ', $build->pageChecks[$page] ?? []);
            $links .= '<li><a href="'.self::fileName($page).'">Page '.$page.'</a> · '.e($why).'</li>';
        }

        $overrides = '';

        foreach ($build->overrides as $lineKey => $override) {
            $overrides .= '<li>'.self::lineLink($lineKey, $listed).' · '.e($override['state']).' · '.e($override['reason']).'</li>';
        }

        $moved = '';

        foreach ($build->wordLines as $wordKey => $move) {
            $moved .= '<li>'.e($wordKey).' · '.self::lineLink($move['page'].':'.$move['to'], $listed).' (quran-text: line '.$move['from'].') · '.e($move['reason']).'</li>';
        }

        $developer = '';

        foreach ($build->needsDeveloper as $lineKey => $note) {
            $developer .= '<li>'.self::lineLink($lineKey, $listed).' · '.e($note).'</li>';
        }

        $sample = '';

        foreach ($sampled as $page) {
            $sample .= '<li><a href="'.self::fileName($page).'">Page '.$page.'</a></li>';
        }

        return '<!doctype html><html lang="en"><meta charset="utf-8"><title>Word-box review: '.e($build->key).'</title>'
            .'<style>body{font:14px system-ui;margin:24px;max-width:900px}td{border:1px solid #ddd;padding:2px 8px}'
            .'table{border-collapse:collapse}code{font-size:13px}</style>'
            .'<h1>Word-box review: '.e($build->key).'</h1>'
            .'<p>Status: <b>'.e($build->status->value).'</b> · '.$build->words.' boxes on '.$build->pages.' pages.</p>'
            .'<p>Digest: <code>'.e($build->digest).'</code></p>'
            .'<h2>Reviewer overrides ('.count($build->overrides).')</h2><ul>'.$overrides.'</ul>'
            .'<h2>Word-line corrections ('.count($build->wordLines).')</h2><ul>'.$moved.'</ul>'
            .'<h2>Needs developer ('.count($build->needsDeveloper).')</h2><ul>'.$developer.'</ul>'
            .'<h2>Random sample ('.count($sampled).' pages, nothing flagged)</h2><ul>'.$sample.'</ul>'
            .'<p>W1 and W6 count pages, W3 and W8 count lines, W2, W4 and W5 count words. Line height H: '.round($build->lineHeight, 2).'.</p>'
            .'<table>'.$counts.'</table>'
            .'<p>The developer approves by setting <code>approved_word_boxes.'.e($build->key).'</code> in <code>apps/api/config/mushaf.php</code> '
            .'to the digest above, after checking every listed page, then re-running the build. The sampled pages were flagged by nothing; '
            .'one word error on any of them fails the run (W7). A line the split gets wrong is fixed in <code>apps/api/resources/svg-mushaf/'
            .'word-box-overrides-'.e($build->key).'.json</code>: key "page:line", the line\'s contour count, the contour indices of each word '
            .'left to right, and a reason.</p>'
            .'<h2>All '.count($listed).' listed pages</h2><ul>'.$links.'</ul></html>';
    }

    /**
     * @param  list<int>  $listed
     */
    private static function lineLink(string $lineKey, array $listed): string
    {
        [$page, $line] = array_map(intval(...), explode(':', $lineKey));
        $label = 'page '.$page.' line '.$line;

        return in_array($page, $listed, true) ? '<a href="'.self::fileName($page).'#line-'.$line.'">'.$label.'</a>' : $label;
    }

    private static function fileName(int $page): string
    {
        return sprintf('page-%03d.html', $page);
    }
}
