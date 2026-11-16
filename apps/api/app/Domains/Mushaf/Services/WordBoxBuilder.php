<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Services;

use App\Domains\Mushaf\Enums\WordBoxesStatus;
use App\Domains\Mushaf\Exceptions\SvgMushafSourceException;
use App\Domains\Mushaf\Exceptions\UnknownSvgMushafException;
use App\Domains\Mushaf\Records\WordBoxBuild;
use App\Domains\Mushaf\Repositories\Contracts\SvgMushafWordBoxRepository;
use App\Domains\Mushaf\Sources\QuranTextSource;
use App\Domains\Mushaf\Sources\SvgMushafDownloader;
use App\Domains\Mushaf\WordBoxes\LineBands;
use App\Domains\Mushaf\WordBoxes\LineOrder;
use App\Domains\Mushaf\WordBoxes\PageContours;
use App\Domains\Mushaf\WordBoxes\WordBoxOverrides;
use App\Domains\Mushaf\WordBoxes\WordSplitter;
use App\Support\FilePath;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

/**
 * Builds the Hafs word boxes from the cached page artwork, the ayah regions and quran-text's words per line, and runs the gate
 * (ADR 0090 decisions 5 and 6). W1, W2, W3, W6 and a refused override are hard failures; W4, W5 and W8 only flag. The boxes are
 * stored, and written to the committed output file, even when the gate fails, so the review sheet can show them; the status
 * says whether they may ship. Neither Tanzil nor word_layouts is read.
 *
 * @phpstan-import-type SheetBox from WordBoxBuild
 * @phpstan-import-type Box from WordBoxBuild
 * @phpstan-import-type WordBoxRow from SvgMushafWordBoxRepository
 * @phpstan-import-type QuranTextWord from QuranTextSource
 *
 * @phpstan-type Settings array{base_height_share: float, no_base_penalty: float, out_of_span_penalty: float, span_tolerance: float, polygon_snap: float, line_order_jump: float, min_width: float, low: float, high: float}
 * @phpstan-type PageResult array{boxes: list<SheetBox>, bands: array<int, array{0: float, 1: float}>, counts: array<string, int>, notes: list<string>, checks: list<string>, flagged: array<int, list<Box>>, widths: list<float>, ratios: list<float>, overrides: array<int, bool>}
 */
final class WordBoxBuilder
{
    /** Only Hafs has word positions in the app: its reciters are followed word by word (ADR 0090 decision 12). */
    private const string KEY = 'hafs';

    private const string ATTRIBUTION = 'Word positions derived from quran-svg and quran-text by quran-ws (CC BY 4.0), modified.';

    private const array CHECKS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W8', 'W5 skipped', 'overrides applied', 'overrides refused'];

    private const array HARD = ['W1', 'W2', 'W3', 'W6', 'overrides refused'];

    private const array PERCENTILES = [0.5, 1.0, 2.0, 5.0, 50.0, 95.0, 98.0, 99.0, 99.5];

    public function __construct(
        private readonly SvgMushafDownloader $downloader,
        private readonly QuranTextSource $quranText,
        private readonly SvgMushafWordBoxRepository $repository,
    ) {}

    /**
     * @throws UnknownSvgMushafException when the key is not Hafs
     * @throws SvgMushafSourceException when the edition is not imported, a file fails check A1 or the overrides are malformed
     */
    public function build(string $key): WordBoxBuild
    {
        if ($key !== self::KEY) {
            throw new UnknownSvgMushafException('['.$key.'] has no word boxes; only '.self::KEY.' is followed word by word.');
        }

        $editionId = $this->repository->editionId($key)
            ?? throw new SvgMushafSourceException('['.$key.'] is not imported. Run mushaf:import '.$key.' first.');

        $settings = $this->settings();
        $folder = (string) config('mushaf.editions.'.$key.'.folder');
        $pageCount = (int) config('mushaf.pages');
        $regions = $this->repository->regions($editionId);
        $words = $this->quranText->words($key, false);
        $overrides = WordBoxOverrides::fromFile(self::file('overrides', $key));
        $words = self::moveWords($words, $overrides->wordLines);
        $splits = $this->splits();

        $heights = [];

        foreach ($regions as $pageRegions) {
            foreach (LineBands::pageRects($pageRegions, $settings['polygon_snap']) as $rects) {
                foreach ($rects as $rect) {
                    $heights[] = $rect[3] - $rect[1];
                }
            }
        }

        $lineHeight = LineBands::lineHeight($heights);
        $counts = array_fill_keys(self::CHECKS, 0);
        $issues = [];
        $pageBoxes = [];
        $pageBands = [];
        $pageChecks = [];
        $flagged = [];
        $widths = [];
        $ratios = [];
        $applied = [];

        for ($page = 1; $page <= $pageCount; $page++) {
            $svg = $this->downloader->bytes($folder, sprintf('svg/%03d.svg', $page), true);
            $result = $this->page($page, $svg, $regions[$page] ?? [], $words[$page] ?? [], $overrides, $splits, $lineHeight, $settings);

            foreach ($result['counts'] as $check => $count) {
                $counts[$check] += $count;
            }

            array_push($issues, ...$result['notes']);
            array_push($widths, ...$result['widths']);
            array_push($ratios, ...$result['ratios']);
            $pageBoxes[$page] = $result['boxes'];
            $pageBands[$page] = $result['bands'];

            if ($result['checks'] !== []) {
                $pageChecks[$page] = $result['checks'];
            }

            if ($result['flagged'] !== []) {
                $flagged[$page] = $result['flagged'];
            }

            foreach ($result['overrides'] as $line => $ok) {
                $applied[$page.':'.$line] = $ok;
            }
        }

        $reviewed = [];

        foreach ($overrides->lines as $lineKey => $override) {
            $reviewed[$lineKey] = ['reason' => $override['reason'], 'state' => match ($applied[$lineKey] ?? null) {
                true => 'applied',
                false => 'refused',
                null => 'unused',
            }];
        }

        $rows = [];

        foreach ($pageBoxes as $page => $boxes) {
            foreach ($boxes as $box) {
                foreach ($this->appPositions($box['surah'], $box['ayah'], $box['position'], $splits) as $position) {
                    $rows[] = [
                        'page' => $page, 'line' => $box['line'], 'surah' => $box['surah'], 'ayah' => $box['ayah'], 'position' => $position,
                        'x0' => $box['x0'], 'y0' => $box['y0'], 'x1' => $box['x1'], 'y1' => $box['y1'],
                    ];
                }
            }
        }

        usort($rows, fn (array $a, array $b): int => [$a['surah'], $a['ayah'], $a['position']] <=> [$b['surah'], $b['ayah'], $b['position']]);

        $digest = $this->digest($rows);
        $failed = array_filter(self::HARD, fn (string $check): bool => $counts[$check] > 0) !== [];
        $approved = config('mushaf.approved_word_boxes.'.$key);

        $status = match (true) {
            $failed => WordBoxesStatus::Failed,
            is_string($approved) && hash_equals($approved, $digest) => WordBoxesStatus::Approved,
            default => WordBoxesStatus::PendingReview,
        };

        DB::transaction(fn () => $this->repository->replace($editionId, $rows, $status, $digest));
        $output = self::file('output', $key);
        $bytes = $this->writeOutput($output, $key, $digest, $status, $rows, $pageBands);

        return new WordBoxBuild(
            key: $key,
            pages: $pageCount,
            words: count($rows),
            lineHeight: $lineHeight,
            counts: $counts,
            issues: $issues,
            pageBoxes: $pageBoxes,
            pageChecks: $pageChecks,
            flaggedLines: $flagged,
            distributions: ['width' => self::percentiles($widths), 'width_per_letter_to_page_median' => self::percentiles($ratios)],
            digest: $digest,
            status: $status,
            output: $output,
            outputBytes: $bytes,
            overrides: $reviewed,
            needsDeveloper: $overrides->needsDeveloper,
            wordLines: $overrides->wordLines,
        );
    }

    /**
     * Moves each word a reviewer found on another line of the artwork. A correction that no longer matches quran-text fails the
     * build, so a pin bump never applies it to the wrong word.
     *
     * @param  array<int, array<int, list<QuranTextWord>>>  $words
     * @param  array<string, array{page: int, from: int, to: int, reason: string}>  $moves
     * @return array<int, array<int, list<QuranTextWord>>>
     *
     * @throws SvgMushafSourceException
     */
    private static function moveWords(array $words, array $moves): array
    {
        foreach ($moves as $key => $move) {
            [$surah, $ayah, $position] = array_map(intval(...), explode(':', $key));
            $found = null;

            foreach ($words[$move['page']][$move['from']] ?? [] as $index => $word) {
                if ([$word['surah'], $word['ayah'], $word['position']] === [$surah, $ayah, $position]) {
                    $found = $index;
                }
            }

            if ($found === null || ! isset($words[$move['page']][$move['to']])) {
                throw new SvgMushafSourceException(sprintf('The word-line correction [%s] does not match quran-text: the word is not on page %d line %d, or the page has no line %d.', $key, $move['page'], $move['from'], $move['to']));
            }

            $from = $words[$move['page']][$move['from']];
            $word = $from[$found];
            unset($from[$found]);
            $words[$move['page']][$move['from']] = array_values($from);
            $words[$move['page']][$move['to']] = [...$words[$move['page']][$move['to']], $word];
        }

        return $words;
    }

    /**
     * One page: W6 and W1, then each line's order, split (or override) with W2, W3 and W8, then W4 and W5 over the page.
     *
     * @param  list<array{surah: int, ayah: int, polygon: string}>  $regions
     * @param  array<int, list<QuranTextWord>>  $lines  quran-text line => its words
     * @param  array<string, int>  $splits
     * @param  Settings  $settings
     * @return PageResult
     *
     * @throws SvgMushafSourceException
     */
    private function page(int $page, string $svg, array $regions, array $lines, WordBoxOverrides $overrides, array $splits, float $lineHeight, array $settings): array
    {
        $counts = array_fill_keys(self::CHECKS, 0);
        $notes = [];
        $checks = [];
        $empty = ['boxes' => [], 'bands' => [], 'flagged' => [], 'widths' => [], 'ratios' => [], 'overrides' => []];

        $inRegions = array_unique(array_map(fn (array $region): string => $region['surah'].':'.$region['ayah'], $regions));
        $inText = [];

        foreach ($lines as $words) {
            foreach ($words as $word) {
                $inText[$word['surah'].':'.$word['ayah']] = true;
            }
        }

        $textOnly = array_diff(array_keys($inText), $inRegions);
        $regionsOnly = array_diff($inRegions, array_keys($inText));

        if ($textOnly !== [] || $regionsOnly !== []) {
            $counts['W6'] = 1;
            $checks[] = 'W6';
            $notes[] = sprintf('W6 page %d: quran-text only [%s], regions only [%s]', $page, implode(', ', $textOnly), implode(', ', $regionsOnly));
        }

        $bands = LineBands::fromRegions($regions, $settings['polygon_snap'], $lineHeight);
        ksort($lines);

        if (count($bands->bands) !== count($lines)) {
            $counts['W1'] = 1;
            $checks[] = 'W1';
            $notes[] = sprintf('W1 page %d: %d text lines in the regions, %d quran-text lines', $page, count($bands->bands), count($lines));

            return $empty + ['counts' => $counts, 'notes' => $notes, 'checks' => $checks];
        }

        $perBand = array_fill(0, count($bands->bands), []);

        foreach (PageContours::fromSvg($svg) as $contour) {
            $band = $bands->bandAt(($contour[1] + $contour[3]) / 2);

            if ($band !== null) {
                $perBand[$band][] = $contour;
            }
        }

        $boxes = [];
        $letters = [];
        $lineNotes = [];
        $lineContours = [];
        $cleanLines = [];
        $pageBands = [];
        $applied = [];
        $tolerance = $settings['span_tolerance'];

        foreach (array_keys($lines) as $index => $line) {
            [$y0, $y1] = $bands->bands[$index];
            $pageBands[$line] = [$y0, $y1];
            $centreY = ($y0 + $y1) / 2;
            $words = $lines[$line];
            usort($words, fn (array $a, array $b): int => [$a['surah'], $a['ayah'], $a['position']] <=> [$b['surah'], $b['ayah'], $b['position']]);
            $words = array_reverse($words); // left to right, as the normalized line runs

            $order = LineOrder::normalise($perBand[$index], $settings['line_order_jump']);
            $contours = $order['contours'];
            $lineContours[$line] = $contours;
            $clean = true;

            if (! $order['contiguous']) {
                $clean = false;
                $lineNotes[$line][] = 'W8 contours still out of order after reordering';
            }

            $spans = array_map(fn (array $word): ?array => $bands->span($word['surah'], $word['ayah'], $centreY, $tolerance), $words);
            $base = array_map(fn (array $c): bool => $c[3] - $c[1] >= $settings['base_height_share'] * ($y1 - $y0), $contours);
            $groups = null;
            $reviewed = false;
            $override = $overrides->for($page, $line);

            if ($override !== null) {
                $reviewed = $override['contours'] === count($contours) && count($override['groups']) === count($words);
                $applied[$line] = $reviewed;

                if ($reviewed) {
                    // Loose contours are in no group, so they shape no box.
                    $groups = $override['groups'];
                    $counts['overrides applied']++;
                    $lineNotes[$line][] = 'override applied: '.$override['reason'];
                } else {
                    $counts['overrides refused']++;
                    $clean = false;
                    $lineNotes[$line][] = sprintf('override refused: it names %d contours and %d words, the line has %d and %d', $override['contours'], count($override['groups']), count($contours), count($words));
                }
            }

            if ($groups === null) {
                $ranges = WordSplitter::split($contours, $spans, $base, $tolerance, $settings['no_base_penalty'], $settings['out_of_span_penalty']);
                $groups = $ranges === null ? null : array_map(fn (array $r): array => range($r[0], $r[1] - 1), $ranges);
            }

            if ($groups === null) {
                $counts['W2'] += count($words);
                $lineNotes[$line][] = sprintf('W2 %d contours for %d words', count($contours), count($words));
                $cleanLines[$line] = false;

                continue;
            }

            $lineBoxes = [];

            foreach ($groups as $k => $indexes) {
                $lo = INF;
                $hi = -INF;
                $hasBase = false;

                foreach ($indexes as $t) {
                    $lo = min($lo, $contours[$t][0]);
                    $hi = max($hi, $contours[$t][2]);
                    $hasBase = $hasBase || $base[$t];
                }

                $word = $words[$k];
                $label = $this->label($word['surah'], $word['ayah'], $word['position'], $splits);
                $centre = ($lo + $hi) / 2;

                // A reviewed override vouches for a short word with no tall letter; the span checks still apply to it.
                $reason = match (true) {
                    ! $hasBase && ! $reviewed => 'no full-height contour',
                    $spans[$k] === null => 'its ayah has no region on this line',
                    $centre < $spans[$k][0] - $tolerance || $centre > $spans[$k][1] + $tolerance => 'centre outside its ayah span',
                    default => null,
                };

                $flags = [];

                if ($reason !== null) {
                    $counts['W2']++;
                    $flags[] = 'W2';
                    $clean = false;
                    $lineNotes[$line][] = sprintf('W2 %s %s', $label, $reason);
                }

                // Adding 0.0 turns a rounded -0.0 into 0.0, so the digest never sees a signed zero.
                $lineBoxes[] = [
                    'line' => $line, 'surah' => $word['surah'], 'ayah' => $word['ayah'], 'position' => $word['position'], 'label' => $label,
                    'x0' => round($lo, 2) + 0.0, 'y0' => $y0, 'x1' => round($hi, 2) + 0.0, 'y1' => $y1, 'contours' => $indexes, 'flags' => $flags,
                ];
                $letters[] = $word['letters'];
            }

            if (count($lineBoxes) >= 2 && ! ($lineBoxes[0]['x0'] < $lineBoxes[count($lineBoxes) - 1]['x0'])) {
                $counts['W3']++;
                $clean = false;
                $lineNotes[$line][] = 'W3 the line runs right to left';
            }

            // W8: a box inside another box on the line means the path interleaves two words there.
            foreach ($lineBoxes as $a => $inner) {
                foreach ($lineBoxes as $b => $outer) {
                    if ($a !== $b && $outer['x0'] <= $inner['x0'] && $inner['x1'] <= $outer['x1']) {
                        $lineBoxes[$a]['flags'][] = 'W8';
                        $clean = false;
                        $lineNotes[$line][] = sprintf('W8 %s lies inside %s', $inner['label'], $outer['label']);

                        break;
                    }
                }
            }

            array_push($boxes, ...$lineBoxes);
            $cleanLines[$line] = $clean;
        }

        // W4 and W5 over the page's boxes. W5 compares width per letter with the page's median.
        $perLetter = [];

        foreach ($boxes as $i => $box) {
            if ($letters[$i] !== null) {
                $perLetter[$i] = ($box['x1'] - $box['x0']) / $letters[$i];
            }
        }

        $median = self::median(array_values($perLetter));
        $widths = [];
        $ratios = [];

        foreach ($boxes as $i => $box) {
            $width = $box['x1'] - $box['x0'];

            if ($width < $settings['min_width']) {
                $counts['W4']++;
                $boxes[$i]['flags'][] = 'W4';
                $lineNotes[$box['line']][] = sprintf('W4 %s width %.2f', $box['label'], $width);
            }

            if (! isset($perLetter[$i]) || $median <= 0.0) {
                $counts['W5 skipped']++;
            } elseif ($perLetter[$i] < $settings['low'] * $median || $perLetter[$i] > $settings['high'] * $median) {
                $counts['W5']++;
                $boxes[$i]['flags'][] = 'W5';
                $lineNotes[$box['line']][] = sprintf('W5 %s width per letter %.2f x the page median', $box['label'], $perLetter[$i] / $median);
            }

            if ($cleanLines[$box['line']]) {
                $widths[] = $width;

                if (isset($perLetter[$i]) && $median > 0.0) {
                    $ratios[] = $perLetter[$i] / $median;
                }
            }
        }

        ksort($lineNotes);
        $flagged = [];

        foreach ($lineNotes as $line => $list) {
            $notes[] = sprintf('page %d line %d: %s', $page, $line, implode('; ', $list));
            $flagged[$line] = $lineContours[$line];

            foreach ($list as $note) {
                if (preg_match('/^W\d/', $note) === 1) {
                    $checks[] = substr($note, 0, 2);
                } elseif (str_starts_with($note, 'override refused')) {
                    $checks[] = 'override refused';
                } elseif (str_starts_with($note, 'override applied')) {
                    $checks[] = 'override applied';
                }
            }

            if (array_filter($list, fn (string $note): bool => str_starts_with($note, 'W8')) !== []) {
                $counts['W8']++;
            }
        }

        return [
            'boxes' => $boxes, 'bands' => $pageBands, 'counts' => $counts, 'notes' => $notes, 'checks' => array_values(array_unique($checks)),
            'flagged' => $flagged, 'widths' => $widths, 'ratios' => $ratios, 'overrides' => $applied,
        ];
    }

    /**
     * The app positions a quran-text word covers. quran-text writes a few word pairs as one word where the app's word index
     * (Tanzil's letter tokens) counts two; `position_splits` lists them, and later words of the ayah move up.
     *
     * @param  array<string, int>  $splits
     * @return list<int>
     */
    private function appPositions(int $surah, int $ayah, int $position, array $splits): array
    {
        $offset = 0;

        foreach ($splits as $key => $covers) {
            [$s, $a, $p] = array_map(intval(...), explode(':', $key));

            if ($s === $surah && $a === $ayah && $p < $position) {
                $offset += $covers - 1;
            }
        }

        $first = $position + $offset;

        return range($first, $first + ($splits[$surah.':'.$ayah.':'.$position] ?? 1) - 1);
    }

    /**
     * @param  array<string, int>  $splits
     */
    private function label(int $surah, int $ayah, int $position, array $splits): string
    {
        return $surah.':'.$ayah.':'.implode('+', $this->appPositions($surah, $ayah, $position, $splits));
    }

    /**
     * @return array<string, int>
     */
    private function splits(): array
    {
        $splits = [];

        foreach ((array) config('mushaf.word_boxes.position_splits') as $key => $covers) {
            if (preg_match('/^\d+:\d+:\d+$/', (string) $key) !== 1 || ! is_int($covers) || $covers < 2) {
                throw new SvgMushafSourceException('The position split ['.$key.'] must map "surah:ayah:position" to 2 or more.');
            }

            $splits[(string) $key] = $covers;
        }

        return $splits;
    }

    /**
     * SHA-256 of the canonical JSON of every box, sorted by (surah, ayah, position), with the word_boxes config and both
     * commits.
     *
     * @param  list<WordBoxRow>  $rows
     */
    private function digest(array $rows): string
    {
        $config = (array) config('mushaf.word_boxes');
        self::sortKeys($config);

        $boxes = array_map(fn (array $row): array => [
            $row['surah'], $row['ayah'], $row['position'], $row['page'], $row['line'],
            sprintf('%.2f', $row['x0']), sprintf('%.2f', $row['y0']), sprintf('%.2f', $row['x1']), sprintf('%.2f', $row['y1']),
        ], $rows);

        return hash('sha256', json_encode([
            'commit' => (string) config('mushaf.commit'),
            'quran_text_commit' => (string) config('mushaf.quran_text.commit'),
            'config' => $config,
            'boxes' => $boxes,
        ], JSON_THROW_ON_ERROR));
    }

    /**
     * The committed output the pack step reads: keys and coordinates only. Each page lists its line bands and its words as
     * [surah, ayah, position, line, x0, x1]; a word's y range is its line's band.
     *
     * @param  list<WordBoxRow>  $rows
     * @param  array<int, array<int, array{0: float, 1: float}>>  $bands
     */
    private function writeOutput(string $path, string $key, string $digest, WordBoxesStatus $status, array $rows, array $bands): int
    {
        $pages = [];

        foreach ($bands as $page => $lines) {
            if ($lines !== []) {
                $pages[$page] = ['lines' => array_map(fn (array $band): array => [$band[0], $band[1]], $lines), 'words' => []];
            }
        }

        foreach ($rows as $row) {
            $pages[$row['page']]['words'][] = [$row['surah'], $row['ayah'], $row['position'], $row['line'], $row['x0'], $row['x1']];
        }

        ksort($pages);

        $json = json_encode([
            'edition' => $key,
            'quran_svg_commit' => (string) config('mushaf.commit'),
            'quran_text_commit' => (string) config('mushaf.quran_text.commit'),
            'digest' => $digest,
            'status' => $status->value,
            'attribution' => self::ATTRIBUTION,
            'word' => ['surah', 'ayah', 'position', 'line', 'x0', 'x1'],
            'pages' => (object) $pages,
        ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES)."\n";

        File::ensureDirectoryExists(dirname($path));
        File::put($path, $json);

        return strlen($json);
    }

    private static function file(string $kind, string $key): string
    {
        $path = sprintf((string) config('mushaf.word_box_files.'.$kind), $key);

        return FilePath::isAbsolute($path) ? $path : resource_path($path);
    }

    /**
     * @return Settings
     */
    private function settings(): array
    {
        return [
            'base_height_share' => (float) config('mushaf.word_boxes.base_height_share'),
            'no_base_penalty' => (float) config('mushaf.word_boxes.no_base_penalty'),
            'out_of_span_penalty' => (float) config('mushaf.word_boxes.out_of_span_penalty'),
            'span_tolerance' => (float) config('mushaf.word_boxes.span_tolerance'),
            'polygon_snap' => (float) config('mushaf.word_boxes.polygon_snap'),
            'line_order_jump' => (float) config('mushaf.word_boxes.line_order_jump'),
            'min_width' => (float) config('mushaf.word_boxes.min_width'),
            'low' => (float) config('mushaf.word_boxes.width_per_letter.low'),
            'high' => (float) config('mushaf.word_boxes.width_per_letter.high'),
        ];
    }

    /**
     * @param  array<int|string, mixed>  $values
     */
    private static function sortKeys(array &$values): void
    {
        ksort($values);

        foreach ($values as &$value) {
            if (is_array($value)) {
                self::sortKeys($value);
            }
        }
    }

    /**
     * @param  list<float>  $values
     */
    private static function median(array $values): float
    {
        if ($values === []) {
            return 0.0;
        }

        sort($values);
        $middle = intdiv(count($values), 2);

        return count($values) % 2 === 1 ? $values[$middle] : ($values[$middle - 1] + $values[$middle]) / 2;
    }

    /**
     * @param  list<float>  $values
     * @return array<string, float>
     */
    private static function percentiles(array $values): array
    {
        if ($values === []) {
            return [];
        }

        sort($values);
        $out = [];

        foreach (self::PERCENTILES as $percent) {
            $out['p'.$percent] = round($values[(int) floor($percent / 100 * (count($values) - 1))], 3);
        }

        return $out;
    }
}
