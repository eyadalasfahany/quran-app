<?php

declare(strict_types=1);

use App\Domains\Mushaf\Enums\WordBoxesStatus;
use App\Domains\Mushaf\Exceptions\SvgMushafSourceException;
use App\Domains\Mushaf\Exceptions\UnknownSvgMushafException;
use App\Domains\Mushaf\Models\SvgMushaf;
use App\Domains\Mushaf\Models\SvgMushafAyahRegion;
use App\Domains\Mushaf\Models\SvgMushafWordBox;
use App\Domains\Mushaf\Services\WordBoxBuilder;
use App\Domains\Mushaf\Sources\QuranTextSource;
use App\Domains\Mushaf\Sources\SvgMushafStore;
use App\Support\Storage\SourceCache;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

// One synthetic page: placeholder rectangles for glyphs, placeholder regions and the keys 1:1 to 1:3. The quran-text fixture
// holds placeholder words ("FIXTURE") and Latin letters for the letter counts. No Quran artwork and no Quran text.

uses(RefreshDatabase::class);

const WORD_BOX_BASE = 'mushafs/hafs/kfqc';

/** Words: [line, surah, ayah, position, letters]. Line 1 holds 1:1; line 2 holds 1:3 on the left and 1:2 on the right. */
const WORD_BOX_WORDS = [
    [1, 1, 1, 1, 4], [1, 1, 1, 2, 4], [1, 1, 1, 3, 4],
    [2, 1, 2, 1, 4], [2, 1, 2, 2, 3], [2, 1, 3, 1, 3],
];

/** Contours in path order: [line, x0, x1, height]. A height of 16 is a full-height letter on a 20-unit line. */
const WORD_BOX_CONTOURS = [
    [1, 10.0, 30.0, 16.0], [1, 40.0, 60.0, 16.0], [1, 70.0, 90.0, 16.0],
    [2, 10.0, 28.0, 16.0], [2, 45.0, 60.0, 16.0], [2, 70.0, 90.0, 16.0],
];

const WORD_BOX_REGIONS = [
    [1, 1, 'M 0 0 L 100 0 L 100 20 L 0 20 Z'],
    [1, 2, 'M 40 20 L 100 20 L 100 40 L 40 40 Z'],
    [1, 3, 'M 0 20 L 40 20 L 40 40 L 0 40 Z'],
];

beforeEach(function (): void {
    Http::preventStrayRequests();
    File::deleteDirectory(SourceCache::path(''));
    $out = storage_path('framework/testing/word-boxes-'.getmypid());
    File::deleteDirectory($out);
    config([
        'mushaf.pages' => 1,
        'mushaf.word_boxes.min_width' => 1.0,
        'mushaf.word_boxes.width_per_letter' => ['low' => 0.25, 'high' => 4.0],
        'mushaf.word_boxes.position_splits' => [],
        'mushaf.approved_word_boxes.hafs' => null,
        'mushaf.word_box_files.output' => $out.'/word-boxes-%s.json',
        'mushaf.word_box_files.overrides' => $out.'/overrides-%s.json',
        'mushaf.word_box_files.contour_output' => $out.'/word-contours-%s.json',
    ]);
});

afterEach(function (): void {
    // Its own prefix: SvgMushafImportTest deletes `test-fixture-*` and may run in a parallel worker.
    foreach (glob(resource_path('svg-mushaf/word-box-fixture-*.json')) ?: [] as $file) {
        File::delete($file);
    }

    File::deleteDirectory(storage_path('framework/testing/word-boxes-'.getmypid()));
});

function wordBoxBlob(string $bytes): string
{
    return hash('sha1', 'blob '.strlen($bytes)."\0".$bytes);
}

/**
 * @param  list<array{0: int, 1: int, 2: int, 3: int, 4: int}>  $words
 */
function wordBoxCsv(array $words): string
{
    $csv = "position,surah,ayah,position_in_ayah,page,line,juz,number,number_last,text,rasm_imlai,marks,resegmented\n";

    foreach ($words as $i => [$line, $surah, $ayah, $position, $letters]) {
        $csv .= sprintf("%d,%d,%d,%d,1,%d,1,%d,%d,FIXTURE,%s,,0\n", $i, $surah, $ayah, $position, $line, $i + 1, $i + 1, str_repeat('a', $letters));
    }

    return (string) gzencode($csv);
}

/**
 * Caches the page SVG and the quran-text file, pins both in fixture manifests, and fills the edition and its regions.
 *
 * @param  list<array{0: int, 1: float, 2: float, 3: float}>  $contours
 * @param  list<array{0: int, 1: int, 2: int, 3: int, 4: int}>  $words
 * @param  list<array{0: int, 1: int, 2: string}>  $regions
 */
function installWordBoxPage(array $contours = WORD_BOX_CONTOURS, array $words = WORD_BOX_WORDS, array $regions = WORD_BOX_REGIONS): void
{
    // The root matrix flips y: page y = 40 - local y.
    $paths = '';

    foreach ($contours as [$line, $x0, $x1, $height]) {
        $centre = ($line - 1) * 20 + 10;
        $paths .= sprintf('M%s %s H%s V%s H%s Z ', $x0, 40 - ($centre - $height / 2), $x1, 40 - ($centre + $height / 2), $x0);
    }

    $svg = '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 345 550">'
        .'<g transform="matrix(1 0 0 -1 0 40)"><g id="ayah_markers"><g transform="translate(0 0)"><path d="M0 0 L5 5 L0 5 Z"/></g></g>'
        .'<g id="content"><g transform="translate(0 0)"><path d="'.trim($paths).'"/></g></g></g></svg>';
    $csv = wordBoxCsv($words);

    app(SvgMushafStore::class)->write(WORD_BOX_BASE, 'svg/001.svg', $svg);
    (new SvgMushafStore('quran-text/'.config('mushaf.quran_text.commit')))->write('data/mushaf', 'hafs.csv.gz', $csv);

    $suffix = Str::lower(Str::random(10));
    File::put(resource_path('svg-mushaf/word-box-fixture-svg-'.$suffix.'.json'), json_encode([
        'commit' => config('mushaf.commit'),
        'editions' => ['hafs' => ['base' => WORD_BOX_BASE, 'pages' => [[wordBoxBlob($svg), strlen($svg), wordBoxBlob('{}'), 2]], 'surah' => [wordBoxBlob('[]'), 2]]],
    ], JSON_THROW_ON_ERROR));
    File::put(resource_path('svg-mushaf/word-box-fixture-text-'.$suffix.'.json'), json_encode([
        'commit' => config('mushaf.quran_text.commit'),
        'files' => ['data/mushaf/hafs.csv.gz' => [wordBoxBlob($csv), strlen($csv)]],
    ], JSON_THROW_ON_ERROR));
    config([
        'mushaf.manifest' => 'svg-mushaf/word-box-fixture-svg-'.$suffix.'.json',
        'mushaf.quran_text.manifest' => 'svg-mushaf/word-box-fixture-text-'.$suffix.'.json',
    ]);

    $edition = SvgMushaf::query()->create([
        'key' => 'hafs', 'folder' => 'hafs', 'edition_year' => 1441, 'source_commit' => config('mushaf.commit'),
        'page_count' => 1, 'ayah_count' => 3, 'imported_at' => now(),
    ]);

    foreach ($regions as [$surah, $ayah, $polygon]) {
        SvgMushafAyahRegion::query()->insert([
            'svg_mushaf_id' => $edition->id, 'page' => 1, 'surah' => $surah, 'ayah' => $ayah, 'label_x' => 1, 'label_y' => 1, 'polygon' => $polygon,
        ]);
    }
}

/**
 * @param  array<string, mixed>  $overrides
 * @param  array<string, string>  $needsDeveloper
 * @param  array<string, mixed>  $wordLines
 */
function writeWordBoxOverrides(array $overrides, array $needsDeveloper = [], array $wordLines = []): void
{
    $path = sprintf((string) config('mushaf.word_box_files.overrides'), 'hafs');
    File::ensureDirectoryExists(dirname($path));
    File::put($path, json_encode(['overrides' => $overrides, 'needs_developer' => $needsDeveloper, 'word_lines' => $wordLines], JSON_THROW_ON_ERROR));
}

/**
 * @return array<string, array{0: float, 1: float, 2: float, 3: float, 4: int}> "surah:ayah:position" => [x0, y0, x1, y1, line]
 */
function storedWordBoxes(): array
{
    $boxes = [];

    foreach (SvgMushafWordBox::query()->get() as $box) {
        $boxes[$box->surah.':'.$box->ayah.':'.$box->position] = [(float) $box->x0, (float) $box->y0, (float) $box->x1, (float) $box->y1, $box->line];
    }

    ksort($boxes);

    return $boxes;
}

it('builds one box per word from quran-text lines, writes the output file and waits for review', function (): void {
    installWordBoxPage();

    $build = app(WordBoxBuilder::class)->build('hafs');
    $output = json_decode(File::get($build->output), true, 512, JSON_THROW_ON_ERROR);

    expect($build->status)->toBe(WordBoxesStatus::PendingReview)
        ->and(array_sum($build->counts))->toBe(0)
        ->and(storedWordBoxes())->toBe([
            '1:1:1' => [70.0, 0.0, 90.0, 20.0, 1],
            '1:1:2' => [40.0, 0.0, 60.0, 20.0, 1],
            '1:1:3' => [10.0, 0.0, 30.0, 20.0, 1],
            '1:2:1' => [70.0, 20.0, 90.0, 40.0, 2],
            '1:2:2' => [45.0, 20.0, 60.0, 40.0, 2],
            '1:3:1' => [10.0, 20.0, 28.0, 40.0, 2],
        ])
        ->and(SvgMushaf::query()->firstOrFail()->word_boxes_digest)->toBe($build->digest)
        ->and($output['digest'])->toBe($build->digest)
        ->and($output['status'])->toBe('pending_review')
        ->and($output['quran_svg_commit'])->toBe(config('mushaf.commit'))
        ->and($output['quran_text_commit'])->toBe(config('mushaf.quran_text.commit'))
        ->and($output['attribution'])->toBe('Word positions derived from quran-svg and quran-text by quran-ws (CC BY 4.0), modified.')
        ->and($output['pages']['1']['lines'])->toBe(['1' => [0, 20], '2' => [20, 40]])
        ->and($output['pages']['1']['words'])->toContain([1, 1, 1, 1, 70, 90], [1, 3, 1, 2, 10, 28])
        ->and($build->outputBytes)->toBe(strlen(File::get($build->output)));
});

it('orders each line by surah, ayah and position from quran-text, whatever the file order', function (): void {
    installWordBoxPage(words: array_reverse(WORD_BOX_WORDS));

    app(WordBoxBuilder::class)->build('hafs');

    expect(storedWordBoxes()['1:1:1'])->toBe([70.0, 0.0, 90.0, 20.0, 1])
        ->and(storedWordBoxes()['1:3:1'])->toBe([10.0, 20.0, 28.0, 40.0, 2]);
});

it('gives a word that quran-text writes as one to every app position it covers, and moves later words up', function (): void {
    config(['mushaf.word_boxes.position_splits' => ['1:1:2' => 2]]);
    installWordBoxPage();

    app(WordBoxBuilder::class)->build('hafs');

    expect(array_intersect_key(storedWordBoxes(), array_flip(['1:1:1', '1:1:2', '1:1:3', '1:1:4'])))->toBe([
        '1:1:1' => [70.0, 0.0, 90.0, 20.0, 1],
        '1:1:2' => [40.0, 0.0, 60.0, 20.0, 1],
        '1:1:3' => [40.0, 0.0, 60.0, 20.0, 1],
        '1:1:4' => [10.0, 0.0, 30.0, 20.0, 1],
    ]);
});

it('gives the same digest on every run, and approves only the configured digest', function (): void {
    installWordBoxPage();
    $first = app(WordBoxBuilder::class)->build('hafs');
    $second = app(WordBoxBuilder::class)->build('hafs');

    config(['mushaf.approved_word_boxes.hafs' => $first->digest]);
    $approved = app(WordBoxBuilder::class)->build('hafs');

    config(['mushaf.approved_word_boxes.hafs' => str_repeat('0', 64)]);
    $other = app(WordBoxBuilder::class)->build('hafs');

    expect($second->digest)->toBe($first->digest)
        ->and($approved->status)->toBe(WordBoxesStatus::Approved)
        ->and($other->status)->toBe(WordBoxesStatus::PendingReview)
        ->and(SvgMushaf::query()->firstOrFail()->word_boxes_status)->toBe(WordBoxesStatus::PendingReview);
});

it('fails the build on a hard check and still stores the boxes it could make', function (string $check, Closure $arrange, int $stored): void {
    $arrange();

    $build = app(WordBoxBuilder::class)->build('hafs');

    expect($build->status)->toBe(WordBoxesStatus::Failed)
        ->and($build->counts[$check])->toBeGreaterThan(0)
        ->and(SvgMushaf::query()->firstOrFail()->word_boxes_status)->toBe(WordBoxesStatus::Failed)
        ->and(SvgMushafWordBox::query()->count())->toBe($stored);
})->with([
    'W1: more quran-text lines than text lines' => ['W1', fn () => installWordBoxPage(words: [...array_slice(WORD_BOX_WORDS, 0, 5), [3, 1, 3, 1, 3]]), 0],
    'W2: a word with no full-height contour' => ['W2', function (): void {
        $contours = WORD_BOX_CONTOURS;
        $contours[1][3] = 2.0;
        installWordBoxPage(contours: $contours);
    }, 6],
    'W3: the last box starts left of the first' => ['W3', fn () => installWordBoxPage(contours: [
        [1, 10.0, 30.0, 16.0], [1, 40.0, 60.0, 16.0], [1, 70.0, 90.0, 16.0], [1, 5.0, 95.0, 16.0], ...array_slice(WORD_BOX_CONTOURS, 3),
    ]), 6],
    'W6: an ayah quran-text puts on the page has no region' => ['W6', fn () => installWordBoxPage(regions: [
        WORD_BOX_REGIONS[0], [1, 2, 'M 0 20 L 100 20 L 100 40 L 0 40 Z'],
    ]), 6],
]);

it('only flags W4 and W5', function (string $check, Closure $arrange, string $key): void {
    $arrange();

    $build = app(WordBoxBuilder::class)->build('hafs');
    $flagged = array_filter($build->pageBoxes[1], fn (array $box): bool => in_array($check, $box['flags'], true));

    expect($build->status)->toBe(WordBoxesStatus::PendingReview)
        ->and($build->counts[$check])->toBe(1)
        ->and(array_map(fn (array $box): string => $box['label'], array_values($flagged)))->toBe([$key]);
})->with([
    'W4: a box narrower than the minimum' => ['W4', function (): void {
        config(['mushaf.word_boxes.min_width' => 15.5]);
        installWordBoxPage();
    }, '1:2:2'],
    'W5: a width per letter far below the page median' => ['W5', function (): void {
        $words = WORD_BOX_WORDS;
        $words[4][4] = 40;
        installWordBoxPage(words: $words);
    }, '1:2:2'],
]);

it('flags W8 when a box lies inside another, and an override fixes the split', function (): void {
    // Line 1: word 2 is drawn in two pieces, and its second piece comes last in the path.
    $contours = [[1, 10.0, 30.0, 16.0], [1, 40.0, 60.0, 16.0], [1, 75.0, 90.0, 16.0], [1, 45.0, 49.0, 16.0], ...array_slice(WORD_BOX_CONTOURS, 3)];
    installWordBoxPage(contours: $contours);

    $flaggedBuild = app(WordBoxBuilder::class)->build('hafs');

    writeWordBoxOverrides(['1:1' => ['contours' => 4, 'groups' => [[0], [1, 3], [2]], 'reason' => 'FIXTURE second piece of word 2']]);
    $fixed = app(WordBoxBuilder::class)->build('hafs');

    expect($flaggedBuild->status)->toBe(WordBoxesStatus::PendingReview)
        ->and($flaggedBuild->counts['W8'])->toBe(1)
        ->and($flaggedBuild->flaggedLines[1])->toHaveKey(1)
        ->and($flaggedBuild->flaggedLines[1][1])->toHaveCount(4)
        ->and($fixed->counts['W8'])->toBe(0)
        ->and($fixed->counts['overrides applied'])->toBe(1)
        ->and(storedWordBoxes()['1:1:2'])->toBe([40.0, 0.0, 60.0, 20.0, 1])
        ->and(storedWordBoxes()['1:1:1'])->toBe([75.0, 0.0, 90.0, 20.0, 1]);
});

it('flags W8 when the contours stay out of order after reordering', function (): void {
    // A narrow contour followed by a wide one starting far to its left: the x-centres agree, the left edges do not.
    installWordBoxPage(contours: [[1, 10.0, 30.0, 16.0], [1, 150.0, 160.0, 16.0], [1, 20.0, 280.0, 16.0], ...array_slice(WORD_BOX_CONTOURS, 3)], regions: [
        [1, 1, 'M 0 0 L 300 0 L 300 20 L 0 20 Z'], ...array_slice(WORD_BOX_REGIONS, 1),
    ]);

    $build = app(WordBoxBuilder::class)->build('hafs');

    expect($build->counts['W8'])->toBe(1)
        ->and(implode("\n", $build->issues))->toContain('page 1 line 1: W8 contours still out of order after reordering');
});

it('lets a reviewed override keep a word with no full-height contour, and leaves its loose contours out of every box', function (): void {
    // Line 1: word 2 has no tall letter, and a mark of another line sits right of word 1.
    $contours = [[1, 10.0, 30.0, 16.0], [1, 40.0, 60.0, 2.0], [1, 70.0, 90.0, 16.0], [1, 95.0, 99.0, 2.0], ...array_slice(WORD_BOX_CONTOURS, 3)];
    installWordBoxPage(contours: $contours);
    writeWordBoxOverrides(['1:1' => ['contours' => 4, 'groups' => [[0], [1], [2]], 'loose' => [3], 'reason' => 'FIXTURE reviewed']]);

    $build = app(WordBoxBuilder::class)->build('hafs');

    expect($build->status)->toBe(WordBoxesStatus::PendingReview)
        ->and($build->counts['W2'])->toBe(0)
        ->and($build->counts['overrides applied'])->toBe(1)
        ->and($build->overrides)->toBe(['1:1' => ['reason' => 'FIXTURE reviewed', 'state' => 'applied']])
        ->and($build->pageChecks[1])->toContain('override applied')
        ->and(storedWordBoxes()['1:1:1'])->toBe([70.0, 0.0, 90.0, 20.0, 1])
        ->and(storedWordBoxes()['1:1:2'])->toBe([40.0, 0.0, 60.0, 20.0, 1]);
});

it('still fails an override that puts a word outside its ayah span', function (): void {
    installWordBoxPage();
    // Line 2, left to right: 1:3:1, 1:2:2, 1:2:1. Giving 1:3:1 the contour at x 45-60 puts it in 1:2's region.
    writeWordBoxOverrides(['1:2' => ['contours' => 3, 'groups' => [[1], [0], [2]], 'reason' => 'FIXTURE wrong']]);

    $build = app(WordBoxBuilder::class)->build('hafs');

    expect($build->status)->toBe(WordBoxesStatus::Failed)
        ->and($build->counts['overrides applied'])->toBe(1)
        ->and(implode("\n", $build->issues))->toContain('W2 1:3:1 centre outside its ayah span');
});

it('moves a word quran-text puts on the wrong line to the line the artwork draws it on, and lists the move in the sheet', function (): void {
    // quran-text puts 1:1:3 on line 2; the artwork draws it at the left end of line 1.
    $words = WORD_BOX_WORDS;
    $words[2][0] = 2;
    installWordBoxPage(words: $words);
    $broken = app(WordBoxBuilder::class)->build('hafs');

    writeWordBoxOverrides([], [], ['1:1:3' => ['page' => 1, 'from' => 2, 'to' => 1, 'reason' => 'FIXTURE drawn on line 1']]);
    $directory = storage_path('framework/testing/word-box-sheet-'.getmypid());
    File::deleteDirectory($directory);

    // The one-page fixture also fails the contour gates (no ornaments, no sajda lines), so the command exits non-zero.
    $this->artisan('mushaf:build-word-boxes', ['key' => 'hafs', '--sheet' => $directory])
        ->expectsOutputToContain('Status: pending_review')
        ->expectsOutputToContain('Contour map failed gate W9, W11')
        ->assertFailed();

    expect($broken->status)->toBe(WordBoxesStatus::Failed)
        ->and(storedWordBoxes()['1:1:3'])->toBe([10.0, 0.0, 30.0, 20.0, 1])
        ->and(File::get($directory.'/index.html'))->toContain('Word-line corrections (1)')
        ->toContain('1:1:3 · <a href="page-001.html#line-1">page 1 line 1</a> (quran-text: line 2) · FIXTURE drawn on line 1');

    File::deleteDirectory($directory);
});

it('refuses a word-line correction that no longer matches quran-text', function (): void {
    installWordBoxPage();
    writeWordBoxOverrides([], [], ['1:1:3' => ['page' => 1, 'from' => 2, 'to' => 1, 'reason' => 'FIXTURE stale']]);

    app(WordBoxBuilder::class)->build('hafs');
})->throws(SvgMushafSourceException::class, 'does not match quran-text');

it('refuses an override whose line no longer has the same contour count', function (): void {
    installWordBoxPage();
    writeWordBoxOverrides(['1:1' => ['contours' => 5, 'groups' => [[0], [1, 4], [2, 3]], 'reason' => 'FIXTURE stale']]);

    $build = app(WordBoxBuilder::class)->build('hafs');

    expect($build->status)->toBe(WordBoxesStatus::Failed)
        ->and($build->counts['overrides refused'])->toBe(1)
        ->and($build->overrides['1:1']['state'])->toBe('refused')
        ->and(storedWordBoxes()['1:1:1'])->toBe([70.0, 0.0, 90.0, 20.0, 1]);
});

it('refuses a malformed overrides file', function (): void {
    installWordBoxPage();
    writeWordBoxOverrides(['1:1' => ['contours' => 3, 'groups' => [[0], [0], [2]], 'reason' => 'FIXTURE']]);

    app(WordBoxBuilder::class)->build('hafs');
})->throws(SvgMushafSourceException::class, 'must use each contour index once');

it('reads only keys, lines, letter counts and body counts from quran-text, and skips unnumbered words', function (): void {
    installWordBoxPage(words: [[1, 1, 0, 1, 4], ...WORD_BOX_WORDS]);

    $words = app(QuranTextSource::class)->words('hafs', true);

    expect($words[1][1])->toHaveCount(3)
        ->and($words[1][1][0])->toBe(['surah' => 1, 'ayah' => 1, 'position' => 1, 'letters' => 4, 'bodies' => 0])
        ->and($words[1][2])->toHaveCount(3);
});

it('refuses a quran-text file that does not match its pin', function (): void {
    installWordBoxPage();
    (new SvgMushafStore('quran-text/'.config('mushaf.quran_text.commit')))->write('data/mushaf', 'hafs.csv.gz', 'tampered');
    Http::fake(['*' => Http::response('tampered', 200)]);

    app(QuranTextSource::class)->words('hafs', false);
})->throws(SvgMushafSourceException::class, 'does not match its pinned size and blob SHA');

it('refuses a mushaf other than Hafs', function (): void {
    app(WordBoxBuilder::class)->build('warsh');
})->throws(UnknownSvgMushafException::class);

it('exits non-zero on a failed gate and writes a review sheet with contour indices for flagged lines', function (): void {
    $contours = WORD_BOX_CONTOURS;
    $contours[1][3] = 2.0;
    installWordBoxPage(contours: $contours);
    $directory = storage_path('framework/testing/word-box-sheet-'.getmypid());
    File::deleteDirectory($directory);

    $this->artisan('mushaf:build-word-boxes', ['key' => 'hafs', '--sheet' => $directory])
        ->expectsOutputToContain('page 1 line 1: W2 1:1:2 no full-height contour')
        ->expectsOutputToContain('Status: failed')
        ->assertFailed();

    expect(File::get($directory.'/index.html'))->toContain('page-001.html')
        ->and(File::get($directory.'/page-001.html'))->toContain('1:1:2')->toContain('stroke="red"')->toContain('line 1: 3 contours');

    File::deleteDirectory($directory);
});

it('exits non-zero when the contour map fails, naming the gate, although the word boxes pass', function (): void {
    installWordBoxPage();

    $this->artisan('mushaf:build-word-boxes', ['key' => 'hafs'])
        ->expectsOutputToContain('Status: pending_review')
        ->expectsOutputToContain('Contour status: failed')
        ->expectsOutputToContain('Contour map failed gate W9, W11 (ADR 0090 A3)')
        ->assertFailed();

    expect(SvgMushaf::query()->firstOrFail()->word_boxes_status)->toBe(WordBoxesStatus::PendingReview)
        ->and(SvgMushafWordBox::query()->count())->toBe(6);
});

it('opens the review sheet with every override, the lines left to the developer and the sample, linked to their lines', function (): void {
    installWordBoxPage();
    writeWordBoxOverrides(
        ['1:1' => ['contours' => 3, 'groups' => [[0], [1], [2]], 'reason' => 'FIXTURE reviewed']],
        ['1:2' => 'FIXTURE left to the developer'],
    );
    $directory = storage_path('framework/testing/word-box-sheet-'.getmypid());
    File::deleteDirectory($directory);

    $this->artisan('mushaf:build-word-boxes', ['key' => 'hafs', '--sheet' => $directory])
        ->expectsOutputToContain('Needs developer: 1:2: FIXTURE left to the developer')
        ->expectsOutputToContain('Contour map failed gate W9, W11')
        ->assertFailed();

    $index = File::get($directory.'/index.html');

    expect($index)->toContain('Reviewer overrides (1)')
        ->toContain('<a href="page-001.html#line-1">page 1 line 1</a> · applied · FIXTURE reviewed')
        ->toContain('Needs developer (1)')
        ->toContain('<a href="page-001.html#line-2">page 1 line 2</a> · FIXTURE left to the developer')
        ->toContain('Random sample (0 pages')
        ->and(Str::before($index, 'All 1 listed pages'))->toContain('Reviewer overrides')
        ->and(File::get($directory.'/page-001.html'))->toContain('id="line-1"')->toContain('id="line-2"');

    File::deleteDirectory($directory);
});
