<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Services;

use App\Domains\Mushaf\Enums\WordBoxesStatus;
use App\Domains\Mushaf\Exceptions\SvgMushafSourceException;
use App\Domains\Mushaf\Exceptions\UnknownSvgMushafException;
use App\Domains\Mushaf\Packs\Tqp\TqpPageScope;
use App\Domains\Mushaf\Packs\Tqp\TqpSubpaths;
use App\Domains\Mushaf\Records\ContourMap;
use App\Domains\Mushaf\Records\WordBoxBuild;
use App\Domains\Mushaf\Repositories\Contracts\SvgMushafContourRepository;
use App\Domains\Mushaf\Repositories\Contracts\SvgMushafWordBoxRepository;
use App\Domains\Mushaf\Sources\QuranTextSource;
use App\Domains\Mushaf\Sources\SvgMushafDownloader;
use App\Domains\Mushaf\WordBoxes\ContourMapBuilder;
use App\Domains\Mushaf\WordBoxes\KeepTogether;
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
 * @phpstan-type Settings array{base_height_share: float, no_base_penalty: float, out_of_span_penalty: float, body_penalty: float, body_min_share: float, body_baseline_share: float, join_narrow: float, join_wide: float, span_tolerance: float, polygon_snap: float, line_order_jump: float, min_width: float, low: float, high: float, debris_extent: float}
 * @phpstan-type PageResult array{boxes: list<SheetBox>, bands: array<int, array{0: float, 1: float}>, counts: array<string, int>, notes: list<string>, checks: list<string>, flagged: array<int, list<Box>>, widths: list<float>, ratios: list<float>, overrides: array<int, bool>}
 */
final class WordBoxBuilder
{
    /** Only Hafs has word positions in the app: its reciters are followed word by word (ADR 0090 decision 12). */
    private const string ATTRIBUTION = 'Word positions derived from quran-svg and quran-text by quran-ws (CC BY 4.0), modified.';

    private const array CHECKS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W8', 'W5 skipped', 'overrides applied', 'overrides refused'];

    private const array HARD = ['W1', 'W2', 'W3', 'W6', 'overrides refused'];

    /** A mark looks straight down or up within its own width plus this margin on each side (page units). */
    private const float MARK_COLUMN = 0.5;

    /** With the letter-body rules on: the split's cost for each contour drawn outside its word's ayah span (page units of width). */
    private const float CONTOUR_SPAN_PENALTY = 50.0;

    /** The page's viewBox size, in page units (every quran-svg page). */
    private const float PAGE_WIDTH = 345.0;

    private const float PAGE_HEIGHT = 550.0;

    /** A mark is shared when the other word's letter is within this distance of it, straight above or below (page units). */
    private const float MARK_SHARED_REACH = 3.0;

    /** ... and no more than this many times as far as its own word's nearest letter. */
    private const float MARK_SHARED_RATIO = 2.0;

    private const array PERCENTILES = [0.5, 1.0, 2.0, 5.0, 50.0, 95.0, 98.0, 99.0, 99.5];

    public function __construct(
        private readonly SvgMushafDownloader $downloader,
        private readonly QuranTextSource $quranText,
        private readonly SvgMushafWordBoxRepository $repository,
        private readonly SvgMushafContourRepository $contourRepository,
    ) {}

    /**
     * @throws UnknownSvgMushafException when the key has no entry in `mushaf.word_box_riwayat`
     * @throws SvgMushafSourceException when the edition is not imported, a file fails check A1 or the overrides are malformed
     */
    public function build(string $key): WordBoxBuild
    {
        if (! is_array(config('mushaf.word_box_riwayat.'.$key))) {
            throw new UnknownSvgMushafException('['.$key.'] has no word boxes; only '.implode(', ', array_keys((array) config('mushaf.word_box_riwayat'))).' are followed word by word.');
        }

        $editionId = $this->repository->editionId($key)
            ?? throw new SvgMushafSourceException('['.$key.'] is not imported. Run mushaf:import '.$key.' first.');

        $settings = $this->settings($key);
        $folder = (string) config('mushaf.editions.'.$key.'.folder');
        $pageCount = (int) config('mushaf.pages');
        $regions = $this->repository->regions($editionId);
        $words = $this->quranText->words($key, false);
        $overrides = WordBoxOverrides::fromFile(self::file('overrides', $key));
        $words = self::moveWords($words, $overrides->wordLines);
        $splits = $this->splits($key);

        $lastWords = $this->lastWords($words);
        $inputs = [];
        $subpaths = new TqpSubpaths;
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
        $joined = [];
        $links = [];

        for ($page = 1; $page <= $pageCount; $page++) {
            $svg = $this->downloader->bytes($folder, sprintf('svg/%03d.svg', $page), true);
            $result = $this->page($page, $svg, $regions[$page] ?? [], $words[$page] ?? [], $overrides, $splits, $lineHeight, $settings);
            $map = $subpaths->map($svg, $page);
            $inputs[$page] = [
                'contours' => $result['contourPage']['contours'], 'lineOf' => $result['contourPage']['lineOf'],
                'words' => $result['contourPage']['words'], 'loose' => $result['contourPage']['loose'],
                'subpaths' => $map['subpaths'], 'content' => $map['content'], 'marks' => $map['marks'], 'regions' => $regions[$page] ?? [],
                // Subpaths that need no owner: those that draw nothing, and contours wholly outside the page.
                'empty' => [...$map['empty'], ...array_map(fn (int $c): int => $map['content'][$c], $result['offPage'])],
            ];

            foreach ($result['counts'] as $check => $count) {
                $counts[$check] += $count;
            }

            array_push($issues, ...$result['notes']);
            array_push($widths, ...$result['widths']);
            array_push($ratios, ...$result['ratios']);
            $pageBoxes[$page] = $result['boxes'];
            $joined[$page] = $result['joined'];
            $links[$page] = $result['links'];
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

        $digest = $this->digest($rows, $key);
        $failed = array_filter(self::HARD, fn (string $check): bool => $counts[$check] > 0) !== [];
        $approved = config('mushaf.approved_word_boxes.'.$key);

        $status = match (true) {
            $failed => WordBoxesStatus::Failed,
            is_string($approved) && hash_equals($approved, $digest) => WordBoxesStatus::Approved,
            default => WordBoxesStatus::PendingReview,
        };

        // The contour map has its own digest and approval; a failed gate here never changes the word boxes (ADR 0090 A3).
        $boxAt = [];

        foreach ($pageBoxes as $boxes) {
            foreach ($boxes as $box) {
                $boxAt[$box['surah'].':'.$box['ayah'].':'.$box['position']] = [$box['x0'], $box['y0'], $box['x1'], $box['y1']];
            }
        }

        $lastBoxes = [];

        foreach ($lastWords as $ayahKey => $last) {
            $lastBoxes[$ayahKey] = ['page' => $last['page'], 'box' => $boxAt[$ayahKey.':'.$last['position']] ?? [0.0, 0.0, 0.0, 0.0]];
        }

        // Exactly 15 sajda lines is a Hafs fact (W11); the other riwayat report their count.
        $contours = ContourMapBuilder::withKeepTogether(ContourMapBuilder::build($inputs, $lastBoxes, $settings['polygon_snap'], $lineHeight, $key === 'hafs'), $joined, $links);
        $contourDigest = $this->contourDigest($contours, $digest);
        $contourFailed = array_filter($contours->checks, fn (int $count): bool => $count > 0) !== [];
        $approvedContours = config('mushaf.approved_word_contours.'.$key);

        $contourStatus = match (true) {
            $contourFailed => WordBoxesStatus::Failed,
            is_string($approvedContours) && hash_equals($approvedContours, $contourDigest) => WordBoxesStatus::Approved,
            default => WordBoxesStatus::PendingReview,
        };

        DB::transaction(function () use ($editionId, $rows, $status, $digest, $contours, $contourStatus, $contourDigest): void {
            $this->repository->replace($editionId, $rows, $status, $digest);
            $this->contourRepository->replace($editionId, $contours->wordRows, $contours->blockRows, $contourStatus, $contourDigest);
        });
        $output = self::file('output', $key);
        $bytes = $this->writeOutput($output, $key, $digest, $status, $rows, $pageBands);
        $contourOutput = self::file('contour_output', $key);
        $this->writeContourOutput($contourOutput, $key, $contourDigest, $contourStatus, $digest, $contours);

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
            contours: $contours,
            contourDigest: $contourDigest,
            contourStatus: $contourStatus,
            contourOutput: $contourOutput,
        );
    }

    /**
     * The last word of each ayah in quran-text (the highest position), keyed "surah:ayah", with its page.
     *
     * @param  array<int, array<int, list<array{surah: int, ayah: int, position: int}>>>  $words  page => line => the line's words
     * @return array<string, array{page: int, position: int, surah: int, ayah: int}>
     */
    private function lastWords(array $words): array
    {
        $last = [];

        foreach ($words as $page => $lines) {
            foreach ($lines as $list) {
                foreach ($list as $word) {
                    $key = $word['surah'].':'.$word['ayah'];

                    if (! isset($last[$key]) || $word['position'] > $last[$key]['position']) {
                        $last[$key] = ['page' => (int) $page, 'position' => (int) $word['position'], 'surah' => (int) $word['surah'], 'ayah' => (int) $word['ayah']];
                    }
                }
            }
        }

        return $last;
    }

    /**
     * SHA-256 over the contour rows, the word-box digest they belong to and the algorithm version (ADR 0090 A3 decision 7).
     */
    private function contourDigest(ContourMap $contours, string $boxDigest): string
    {
        return hash('sha256', json_encode([
            'commit' => (string) config('mushaf.commit'),
            'quran_text_commit' => (string) config('mushaf.quran_text.commit'),
            'word_boxes_digest' => $boxDigest,
            'algorithm' => ContourMapBuilder::ALGORITHM,
            'words' => array_map(fn (array $row): array => [$row['surah'], $row['ayah'], $row['position'], $row['first'], $row['count'], $row['flag']], $contours->wordRows),
            'blocks' => array_map(fn (array $row): array => [$row['page'], $row['kind'], $row['ord'], $row['surah'], $row['ayah'], $row['first'], $row['count'], $row['x0'], $row['y0'], $row['x1'], $row['y1']], $contours->blockRows),
        ], JSON_THROW_ON_ERROR));
    }

    private function writeContourOutput(string $path, string $key, string $digest, WordBoxesStatus $status, string $boxDigest, ContourMap $contours): void
    {
        $json = json_encode([
            'edition' => $key,
            'quran_svg_commit' => (string) config('mushaf.commit'),
            'quran_text_commit' => (string) config('mushaf.quran_text.commit'),
            'word_boxes_digest' => $boxDigest,
            'digest' => $digest,
            'status' => $status->value,
            'attribution' => self::ATTRIBUTION,
            'word' => ['surah', 'ayah', 'position', 'first', 'count', 'flag'],
            'block' => ['page', 'kind', 'ord', 'surah', 'ayah', 'first', 'count', 'x0', 'y0', 'x1', 'y1'],
            'words' => array_map(fn (array $row): array => [$row['surah'], $row['ayah'], $row['position'], $row['first'], $row['count'], $row['flag']], $contours->wordRows),
            'blocks' => array_map(fn (array $row): array => [$row['page'], $row['kind'], $row['ord'], $row['surah'], $row['ayah'], $row['first'], $row['count'], $row['x0'], $row['y0'], $row['x1'], $row['y1']], $contours->blockRows),
        ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES)."\n";

        File::ensureDirectoryExists(dirname($path));
        File::put($path, $json);
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
    /**
     * One page's boxes and checks, and its contour inputs (ADR 0090 step 13 A1, A3).
     *
     * @param  list<array{surah: int, ayah: int, polygon: string}>  $regions
     * @param  array<int, list<array{surah: int, ayah: int, position: int, letters: int|null, bodies: int}>>  $lines  line => its words
     * @param  array<string, int>  $splits  "surah:ayah:position" => the app words it covers
     * @param  array<string, float>  $settings
     * @return array{boxes: list<array{line: int, surah: int, ayah: int, position: int, label: string, x0: float, y0: float, x1: float, y1: float, contours: list<int>, flags: list<string>}>, bands: array<int, array{0: float, 1: float}>, counts: array<string, int>, notes: list<string>, checks: list<string>, flagged: array<int, list<array{0: float, 1: float, 2: float, 3: float}>>, widths: list<float>, ratios: list<float>, overrides: array<int, bool>, joined: list<array{surah: int, ayah: int, first: int, count: int, box: array{0: float, 1: float, 2: float, 3: float}}>, links: list<array{surah: int, ayah: int, position: int, box: array{0: float, 1: float, 2: float, 3: float}}>, offPage: list<int>, contourPage: array{contours: list<array{0: float, 1: float, 2: float, 3: float}>, lineOf: list<int|null>, words: list<array{surah: int, ayah: int, position: int, apps: list<int>, line: int, contours: list<int>, x0: float, x1: float}>, loose: list<array{contour: int, loose: int, line: int, attach: string|null, ornament: bool}>}}
     */
    private function page(int $page, string $svg, array $regions, array $lines, WordBoxOverrides $overrides, array $splits, float $lineHeight, array $settings): array
    {
        $counts = array_fill_keys(self::CHECKS, 0);
        $notes = [];
        $checks = [];
        $empty = ['boxes' => [], 'bands' => [], 'flagged' => [], 'widths' => [], 'ratios' => [], 'overrides' => [], 'joined' => [], 'links' => [], 'offPage' => []];

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

            return $empty + ['counts' => $counts, 'notes' => $notes, 'checks' => $checks, 'contourPage' => ['contours' => PageContours::fromSvg($svg), 'lineOf' => [], 'words' => [], 'loose' => []]];
        }

        $perBand = array_fill(0, count($bands->bands), []);
        $perBandIndex = array_fill(0, count($bands->bands), []);
        $pageContours = PageContours::fromSvg($svg);
        $pagePoints = $settings['body_penalty'] > 0.0 ? PageContours::pointsFromSvg($svg) : [];
        $bandOf = [];

        $debris = [];
        $offPage = [];
        [$pageLeft, $pageTop] = (new TqpPageScope)->viewBoxOrigin($svg);

        foreach ($pageContours as $index => $contour) {
            // A contour wholly outside the page's viewBox is never seen in print (Warsh page 300 has a few): no word owns it.
            if ($contour[2] < $pageLeft || $contour[0] > $pageLeft + self::PAGE_WIDTH || $contour[3] < $pageTop || $contour[1] > $pageTop + self::PAGE_HEIGHT) {
                $offPage[] = $index;
                $bandOf[$index] = null;

                continue;
            }

            $band = $bands->bandAt(($contour[1] + $contour[3]) / 2);
            $bandOf[$index] = $band;

            // Source debris (a contour no bigger than debris_extent either way) takes no part in the split or a box.
            if ($band !== null && $settings['debris_extent'] >= $contour[2] - $contour[0] && $settings['debris_extent'] >= $contour[3] - $contour[1]) {
                $debris[] = [$index, $band];
            } elseif ($band !== null) {
                $perBand[$band][] = $contour;
                $perBandIndex[$band][] = $index;
            }
        }

        $wordContours = [];
        $looseContours = [];

        $boxes = [];
        $letters = [];
        $bodyCounts = [];
        $sharedMarks = [];
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
            // normalised position => index in the page's content list (the TQP subpath map is keyed by it)
            $documentIndex = array_map(fn (int $p): int => $perBandIndex[$index][$p], $order['order']);
            $clean = true;

            if (! $order['contiguous']) {
                $clean = false;
                $lineNotes[$line][] = 'W8 contours still out of order after reordering';
            }

            $spans = array_map(fn (array $word): ?array => $bands->span($word['surah'], $word['ayah'], $centreY, $tolerance), $words);
            $base = array_map(fn (array $c): bool => $c[3] - $c[1] >= $settings['base_height_share'] * ($y1 - $y0), $contours);
            $isBody = self::letterBodies($contours, $base, $y0, $y1, $settings['body_min_share'], $settings['body_baseline_share']);
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
                $bodies = array_map(fn (array $word): int => $word['bodies'], $words);
                // With the letter-body rules on, a group needs a letter body (full height, or short on the baseline), not only a
                // full-height contour: a short word such as «في» is a word of its own.
                $splitBase = $settings['body_penalty'] > 0.0 ? $isBody : $base;
                $contourSpanPenalty = $settings['body_penalty'] > 0.0 ? self::CONTOUR_SPAN_PENALTY : 0.0;
                $ranges = WordSplitter::split($contours, $spans, $splitBase, $tolerance, $settings['no_base_penalty'], $settings['out_of_span_penalty'], $bodies, $settings['body_penalty'], $isBody, $contourSpanPenalty);
                $groups = $ranges === null ? null : array_map(fn (array $r): array => range($r[0], $r[1] - 1), $ranges);

                // Where the path draws a word ahead of its place, the groups come out of left-to-right order and every label on
                // the line shifts. Split again over the contours sorted by x-centre and keep that when it runs in order.
                // The same when a word's centre leaves its ayah's span (the path drew the next ayah's words inside this one), and,
                // with the letter-body rules on, also when the x-order split matches the words' letter counts better without more
                // too-narrow words: a path drawn out of place can give an in-order split shifted by a word, which only the letter
                // counts show. (Comparing total cost instead favours slivers: x order can always cut a narrower word.)
                if ($groups !== null && $settings['body_penalty'] > 0.0) {
                    $byX = array_keys($contours);
                    usort($byX, fn (int $a, int $b): int => ($contours[$a][0] + $contours[$a][2]) <=> ($contours[$b][0] + $contours[$b][2]) ?: $a <=> $b);
                    $pick = fn (array $values): array => array_map(fn (int $i): mixed => $values[$i], $byX);
                    $sorted = WordSplitter::split($pick($contours), $spans, $pick($splitBase), $tolerance, $settings['no_base_penalty'], $settings['out_of_span_penalty'], $bodies, $settings['body_penalty'], $pick($isBody), $contourSpanPenalty);
                    $retry = $sorted === null ? null : array_map(fn (array $r): array => array_map(fn (int $i): int => $byX[$i], range($r[0], $r[1] - 1)), $sorted);

                    $broken = ! self::inOrder($groups, $contours) || self::spanMisses($groups, $contours, $spans, $tolerance) > 0;
                    $better = $retry !== null && self::inOrder($retry, $contours)
                        && self::spanMisses($retry, $contours, $spans, $tolerance) <= self::spanMisses($groups, $contours, $spans, $tolerance)
                        && ($broken
                            || (self::bodyMismatch($retry, $isBody, $bodies) < self::bodyMismatch($groups, $isBody, $bodies)
                                && self::narrowWords($retry, $contours, $settings['min_width']) <= self::narrowWords($groups, $contours, $settings['min_width'])));

                    if ($retry !== null && $better) {
                        $groups = array_map(function (array $group): array {
                            sort($group);

                            return $group;
                        }, $retry);
                        $lineNotes[$line][] = 'split in x order: the path draws a word out of place';
                    }
                }
            }

            $contourSpanPenalty = $settings['body_penalty'] > 0.0 ? self::CONTOUR_SPAN_PENALTY : 0.0;

            // Last resort for a line that still breaks a hard rule (a word outside its ayah's span or with no full-height
            // contour, or the line out of order): try the other splits, in path order and in x order, with and without the
            // letter-body count, and keep the first that breaks none. A line no split passes stays failed for review.
            if ($groups !== null && ! $reviewed && $settings['body_penalty'] > 0.0 && ! self::passesHardRules($groups, $contours, $spans, $isBody, $tolerance)) {
                $byX = array_keys($contours);
                usort($byX, fn (int $a, int $b): int => ($contours[$a][0] + $contours[$a][2]) <=> ($contours[$b][0] + $contours[$b][2]) ?: $a <=> $b);

                foreach ([array_keys($contours), $byX] as $order) {
                    foreach ([0.0, $settings['body_penalty'], 2 * $settings['body_penalty']] as $penalty) {
                        $pick = fn (array $values): array => array_map(fn (int $i): mixed => $values[$i], $order);
                        $tried = WordSplitter::split($pick($contours), $spans, $pick($isBody), $tolerance, $settings['no_base_penalty'], $settings['out_of_span_penalty'], array_map(fn (array $word): int => $word['bodies'], $words), $penalty, $pick($isBody), $contourSpanPenalty);
                        $candidate = $tried === null ? null : array_map(function (array $r) use ($order): array {
                            $group = array_map(fn (int $i): int => $order[$i], range($r[0], $r[1] - 1));
                            sort($group);

                            return $group;
                        }, $tried);

                        if ($candidate !== null && self::passesHardRules($candidate, $contours, $spans, $isBody, $tolerance)) {
                            $groups = $candidate;
                            $lineNotes[$line][] = sprintf('split again (%s order, body penalty %s): the first splits broke a hard rule', $order === $byX ? 'x' : 'path', $penalty);

                            break 2;
                        }
                    }
                }
            }

            if ($groups === null) {
                $counts['W2'] += count($words);
                $lineNotes[$line][] = sprintf('W2 %d contours for %d words', count($contours), count($words));
                $cleanLines[$line] = false;

                continue;
            }

            $lineBoxes = [];

            foreach ($reviewed ? $override['loose'] : [] as $loose) {
                $looseContours[] = [
                    'contour' => $documentIndex[$loose], 'loose' => $loose, 'line' => $line,
                    'attach' => $override['attach'][$loose] ?? null, 'ornament' => in_array($loose, $override['ornaments'] ?? [], true),
                ];
            }

            foreach ($groups as $k => $indexes) {
                $lo = INF;
                $hi = -INF;
                $hasBase = false;

                foreach ($indexes as $t) {
                    $lo = min($lo, $contours[$t][0]);
                    $hi = max($hi, $contours[$t][2]);
                    // With the letter-body rules on, a short letter on the baseline (a short dal or ra) counts as the word's letter.
                    $hasBase = $hasBase || ($settings['body_penalty'] > 0.0 ? $isBody[$t] : $base[$t]);
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
                $wordContours[] = [
                    'line' => $line, 'surah' => $word['surah'], 'ayah' => $word['ayah'], 'position' => $word['position'],
                    'apps' => $this->appPositions($word['surah'], $word['ayah'], $word['position'], $splits),
                    'contours' => array_map(fn (int $t): int => $documentIndex[$t], $indexes),
                    'x0' => round($lo, 2) + 0.0, 'x1' => round($hi, 2) + 0.0,
                ];
                $letters[] = $word['letters'];
                $bodyIndexes = array_values(array_filter($indexes, fn (int $t): bool => $isBody[$t]));
                $bodyCounts[] = [
                    'text' => $word['bodies'], 'drawn' => count($bodyIndexes),
                    'centres' => array_map(fn (int $t): float => ($contours[$t][0] + $contours[$t][2]) / 2, $bodyIndexes),
                ];
            }

            // Neighbours that share an unclear mark (it sits about as close to the other word's letter as to its own word's) are
            // kept together, so the mark shows where it is printed whichever word holds it (6:6).
            foreach (array_keys($groups) as $k) {
                $sharedMarks[] = $settings['body_penalty'] > 0.0 && isset($groups[$k + 1])
                    && self::shareMark($groups[$k], $groups[$k + 1], $contours, $isBody, array_map(fn (int $t): array => $pagePoints[$documentIndex[$t]] ?? [], array_keys($contours)));
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

        // Debris is a loose contour of the nearest word on its line, so every subpath is still claimed (W10).
        $printedLineOf = array_keys($lines);

        foreach ($debris as [$index, $band]) {
            $looseContours[] = ['contour' => $index, 'loose' => -1, 'line' => $printedLineOf[$band], 'attach' => null, 'ornament' => false];
        }

        if ($debris !== []) {
            $notes[] = sprintf('page %d: %d debris contours attached to their nearest word', $page, count($debris));
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

        $links = $settings['body_penalty'] > 0.0 ? KeepTogether::links($boxes, $wordContours, $bodyCounts, $sharedMarks) : [];
        $joined = $settings['body_penalty'] > 0.0 ? KeepTogether::runs($boxes, $wordContours, $perLetter, $median, $bodyCounts, $sharedMarks, $settings['join_narrow'], $settings['join_wide']) : [];

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

        $lineOf = [];
        $printedLines = array_keys($lines);

        foreach ($bandOf as $band) {
            $lineOf[] = $band === null ? null : $printedLines[$band];
        }

        return [
            'boxes' => $boxes, 'bands' => $pageBands, 'counts' => $counts, 'notes' => $notes, 'checks' => array_values(array_unique($checks)),
            'flagged' => $flagged, 'widths' => $widths, 'ratios' => $ratios, 'overrides' => $applied, 'joined' => $joined, 'links' => $links, 'offPage' => $offPage,
            'contourPage' => ['contours' => $pageContours, 'lineOf' => $lineOf, 'words' => $wordContours, 'loose' => $looseContours],
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
    private function splits(string $key): array
    {
        $splits = [];

        foreach ((array) ($key === 'hafs' ? config('mushaf.word_boxes.position_splits') : config('mushaf.word_box_riwayat.'.$key.'.position_splits')) as $splitKey => $covers) {
            if (preg_match('/^\d+:\d+:\d+$/', (string) $splitKey) !== 1 || ! is_int($covers) || $covers < 2) {
                throw new SvgMushafSourceException('The position split ['.$splitKey.'] must map "surah:ayah:position" to 2 or more.');
            }

            $splits[(string) $splitKey] = $covers;
        }

        return $splits;
    }

    /**
     * SHA-256 of the canonical JSON of every box, sorted by (surah, ayah, position), with the word_boxes config and both
     * commits.
     *
     * @param  list<WordBoxRow>  $rows
     */
    private function digest(array $rows, string $key = 'hafs'): string
    {
        $config = (array) config('mushaf.word_boxes');

        // The letter-body settings came after the approval; while the penalty is off they change nothing, so the approved
        // digest must not see them.
        if ((float) ($config['body_penalty'] ?? 0.0) === 0.0) {
            unset($config['body_penalty'], $config['body_min_share'], $config['body_baseline_share'], $config['join_narrow'], $config['join_wide']);
        }

        // Another riwayah's own settings are part of what its reviewer approves; Hafs keeps the digest it was approved with.
        if ($key !== 'hafs') {
            $config['riwayah'] = (array) config('mushaf.word_box_riwayat.'.$key);
            $config['key'] = $key;
        }

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
    private function settings(string $key = 'hafs'): array
    {
        return [
            'base_height_share' => (float) config('mushaf.word_boxes.base_height_share'),
            'no_base_penalty' => (float) config('mushaf.word_boxes.no_base_penalty'),
            'out_of_span_penalty' => (float) config('mushaf.word_boxes.out_of_span_penalty'),
            'body_penalty' => (float) ($key === 'hafs' ? config('mushaf.word_boxes.body_penalty') : config('mushaf.word_box_riwayat.'.$key.'.body_penalty', 0.0)),
            'body_min_share' => (float) config('mushaf.word_boxes.body_min_share'),
            'body_baseline_share' => (float) config('mushaf.word_boxes.body_baseline_share'),
            'join_narrow' => (float) config('mushaf.word_boxes.join_narrow'),
            'join_wide' => (float) config('mushaf.word_boxes.join_wide'),
            'span_tolerance' => (float) config('mushaf.word_boxes.span_tolerance'),
            'polygon_snap' => (float) config('mushaf.word_boxes.polygon_snap'),
            'line_order_jump' => (float) config('mushaf.word_boxes.line_order_jump'),
            'min_width' => (float) config('mushaf.word_boxes.min_width'),
            'low' => (float) ($key === 'hafs' ? config('mushaf.word_boxes.width_per_letter.low') : config('mushaf.word_box_riwayat.'.$key.'.width_per_letter.low')),
            'high' => (float) ($key === 'hafs' ? config('mushaf.word_boxes.width_per_letter.high') : config('mushaf.word_box_riwayat.'.$key.'.width_per_letter.high')),
            'debris_extent' => (float) config('mushaf.word_box_riwayat.'.$key.'.debris_extent', 0.0),
        ];
    }

    /**
     * Whether two neighbouring words share an unclear mark: a mark of one sits, straight above or below, within MARK_SHARED_REACH
     * of the other word's letter and no more than MARK_SHARED_RATIO times as far from it as from its own word's nearest letter.
     *
     * @param  list<int>  $a
     * @param  list<int>  $b
     * @param  list<array{0: float, 1: float, 2: float, 3: float}>  $contours
     * @param  list<bool>  $isBody
     * @param  list<list<array{0: float, 1: float}>>  $outlines
     */
    private static function shareMark(array $a, array $b, array $contours, array $isBody, array $outlines): bool
    {
        foreach ([[$a, $b], [$b, $a]] as [$own, $other]) {
            foreach ($own as $mark) {
                if ($isBody[$mark]) {
                    continue;
                }

                $toOwn = INF;
                $toOther = INF;

                foreach ($own as $body) {
                    if ($isBody[$body]) {
                        $toOwn = min($toOwn, self::verticalGap($contours[$mark], $outlines[$body]));
                    }
                }

                foreach ($other as $body) {
                    if ($isBody[$body]) {
                        $toOther = min($toOther, self::verticalGap($contours[$mark], $outlines[$body]));
                    }
                }

                if ($toOther <= self::MARK_SHARED_REACH && $toOther <= self::MARK_SHARED_RATIO * $toOwn) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * How far a mark is from a letter straight above or below it: the smallest vertical gap between the mark's box and the
     * letter's outline within the mark's own width (with MARK_COLUMN on each side). Outline at the mark's own height is beside
     * it and does not count. The outline is followed between its points,
     * so a long stroke crossing the column counts. INF when the letter never passes under or over the mark.
     *
     * @param  array{0: float, 1: float, 2: float, 3: float}  $mark
     * @param  list<array{0: float, 1: float}>  $outline
     */
    private static function verticalGap(array $mark, array $outline): float
    {
        $left = $mark[0] - self::MARK_COLUMN;
        $right = $mark[2] + self::MARK_COLUMN;
        $gap = INF;
        $count = count($outline);

        for ($i = 0; $i < $count; $i++) {
            [$x0, $y0] = $outline[$i];
            [$x1, $y1] = $outline[($i + 1) % $count];
            $lo = max($left, min($x0, $x1));
            $hi = min($right, max($x0, $x1));

            if ($lo > $hi) {
                continue;
            }

            // The segment's y at both ends of its part inside the column.
            foreach ([$lo, $hi] as $x) {
                $y = $x1 === $x0 ? min($y0, $y1) : $y0 + ($y1 - $y0) * ($x - $x0) / ($x1 - $x0);
                // A point at the mark's own height is beside it, not under or over it.
                if ($y > $mark[3]) {
                    $gap = min($gap, $y - $mark[3]);
                } elseif ($y < $mark[1]) {
                    $gap = min($gap, $mark[1] - $y);
                }
            }
        }

        return $gap;
    }

    /**
     * How far a line's groups are from their words' letter-body counts (the sum over words of the difference).
     *
     * @param  list<list<int>>  $groups
     * @param  list<bool>  $isBody
     * @param  list<int>  $bodies
     */
    private static function bodyMismatch(array $groups, array $isBody, array $bodies): int
    {
        $total = 0;

        foreach ($groups as $k => $group) {
            $total += abs(count(array_filter($group, fn (int $index): bool => $isBody[$index])) - ($bodies[$k] ?? 0));
        }

        return $total;
    }

    /**
     * How many of a line's groups are narrower than the narrowest plausible word (W4).
     *
     * @param  list<list<int>>  $groups
     * @param  list<array{0: float, 1: float, 2: float, 3: float}>  $contours
     */
    private static function narrowWords(array $groups, array $contours, float $minWidth): int
    {
        $narrow = 0;

        foreach ($groups as $group) {
            $lo = INF;
            $hi = -INF;

            foreach ($group as $index) {
                $lo = min($lo, $contours[$index][0]);
                $hi = max($hi, $contours[$index][2]);
            }

            $narrow += $hi - $lo < $minWidth ? 1 : 0;
        }

        return $narrow;
    }

    /**
     * Whether a line's groups break none of the hard rules: in left-to-right order (W3 too), every word with a letter body, its
     * centre and every one of its letter bodies inside its ayah's span, and every mark within reach of a letter of its own word.
     *
     * @param  list<list<int>>  $groups
     * @param  list<array{0: float, 1: float, 2: float, 3: float}>  $contours
     * @param  list<array{0: float, 1: float}|null>  $spans
     * @param  list<bool>  $base
     */
    private static function passesHardRules(array $groups, array $contours, array $spans, array $base, float $tolerance): bool
    {
        foreach ($groups as $group) {
            if (array_filter($group, fn (int $index): bool => $base[$index]) === []) {
                return false;
            }
        }

        // A mark sits near a letter of its own word: one far from all of them (a stop sign over another word) is misplaced.
        foreach ($groups as $group) {
            foreach ($group as $index) {
                if ($base[$index]) {
                    continue;
                }

                $near = false;

                foreach ($group as $letter) {
                    if ($base[$letter] && $contours[$index][0] <= $contours[$letter][2] + self::MARK_SHARED_REACH * 2 && $contours[$index][2] >= $contours[$letter][0] - self::MARK_SHARED_REACH * 2) {
                        $near = true;

                        break;
                    }
                }

                if (! $near) {
                    return false;
                }
            }
        }

        // W3: the line's first box starts left of its last one.
        $first = INF;
        $last = INF;

        foreach ($groups[0] ?? [] as $index) {
            $first = min($first, $contours[$index][0]);
        }

        foreach ($groups[count($groups) - 1] ?? [] as $index) {
            $last = min($last, $contours[$index][0]);
        }

        if (count($groups) >= 2 && ! ($first < $last)) {
            return false;
        }

        // A letter drawn in another ayah's region is never this word's (marks may overhang, letters do not).
        foreach ($groups as $k => $group) {
            foreach ($group as $index) {
                $centre = ($contours[$index][0] + $contours[$index][2]) / 2;

                if ($base[$index] && ($spans[$k] === null || $centre < $spans[$k][0] - $tolerance || $centre > $spans[$k][1] + $tolerance)) {
                    return false;
                }
            }
        }

        return self::inOrder($groups, $contours) && self::spanMisses($groups, $contours, $spans, $tolerance) === 0;
    }

    /**
     * How many groups have their x-centre outside their word's span (or have no span).
     *
     * @param  list<list<int>>  $groups
     * @param  list<array{0: float, 1: float, 2: float, 3: float}>  $contours
     * @param  list<array{0: float, 1: float}|null>  $spans
     */
    private static function spanMisses(array $groups, array $contours, array $spans, float $tolerance): int
    {
        $misses = 0;

        foreach ($groups as $k => $group) {
            $lo = INF;
            $hi = -INF;

            foreach ($group as $index) {
                $lo = min($lo, $contours[$index][0]);
                $hi = max($hi, $contours[$index][2]);
            }

            $centre = ($lo + $hi) / 2;
            $span = $spans[$k] ?? null;

            if ($span === null || $centre < $span[0] - $tolerance || $centre > $span[1] + $tolerance) {
                $misses++;
            }
        }

        return $misses;
    }

    /**
     * Whether a line's groups run left to right: each group's x-centre is left of the next one's.
     *
     * @param  list<list<int>>  $groups
     * @param  list<array{0: float, 1: float, 2: float, 3: float}>  $contours
     */
    private static function inOrder(array $groups, array $contours): bool
    {
        $previous = -INF;

        foreach ($groups as $group) {
            $lo = INF;
            $hi = -INF;

            foreach ($group as $index) {
                $lo = min($lo, $contours[$index][0]);
                $hi = max($hi, $contours[$index][2]);
            }

            if (($lo + $hi) / 2 <= $previous) {
                return false;
            }

            $previous = ($lo + $hi) / 2;
        }

        return true;
    }

    /**
     * Which of a line's contours count as letter bodies for the body penalty: every full-height contour, and a shorter one (at
     * least `$minShare` of the line) that crosses the level `$baselineShare` of the line above the baseline. The
     * baseline is the median bottom of the full-height contours. Marks float above or below the baseline, so they do not cross it.
     *
     * @param  list<array{0: float, 1: float, 2: float, 3: float}>  $contours
     * @param  list<bool>  $base
     * @return list<bool>
     */
    private static function letterBodies(array $contours, array $base, float $y0, float $y1, float $minShare, float $baselineShare): array
    {
        $height = $y1 - $y0;
        $bottoms = [];

        foreach ($contours as $index => $contour) {
            if ($base[$index]) {
                $bottoms[] = $contour[3];
            }
        }

        $level = ($bottoms === [] ? ($y0 + $y1) / 2 : self::median($bottoms)) - $baselineShare * $height;

        return array_map(
            fn (array $contour, bool $tall): bool => $tall
                || ($minShare * $height <= $contour[3] - $contour[1] && $contour[1] <= $level && $level <= $contour[3]),
            $contours,
            $base,
        );
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
