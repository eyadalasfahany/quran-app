<?php

declare(strict_types=1);

use App\Domains\Mushaf\Records\ContourMap;
use App\Domains\Mushaf\WordBoxes\ContourMapBuilder;

// Synthetic shapes and placeholder labels only: no Quran artwork, no Quran text (ADR 0090 step 13 A6).

/**
 * One synthetic page: two printed lines (bands 40-78 and 78-110) and ayah 1:1 with four words. Contour c has TQP subpath
 * (marks first) + c, so the default mark is subpath 0.
 *
 * @param  list<array{0: float, 1: float, 2: float, 3: float}>|null  $contours
 * @param  array<int, int|null>  $lineOf
 * @param  list<array<string, mixed>>|null  $words
 * @param  list<array<string, mixed>>  $loose
 * @param  list<array<string, mixed>>|null  $marks
 * @return array<string, mixed>
 */
function contourPageInput(?array $contours = null, ?array $lineOf = null, ?array $words = null, ?array $loose = null, ?array $marks = null): array
{
    $contours ??= [
        [50.0, 10.0, 300.0, 20.0], // c0: title block, out of band
        [200.0, 45.0, 260.0, 60.0], // c1: word 1:1:1
        [100.0, 45.0, 150.0, 60.0], // c2: word 1:1:2
        [120.0, 70.0, 125.0, 76.0], // c3: a mark of the line below, loose
        [200.0, 85.0, 260.0, 105.0], // c4: word 1:1:3
        [100.0, 85.0, 150.0, 105.0], // c5: word 1:1:4 (last word of the ayah)
    ];
    $lineOf ??= [null, 1, 1, 1, 2, 2];
    $words ??= [
        ['surah' => 1, 'ayah' => 1, 'position' => 1, 'apps' => [1], 'line' => 1, 'contours' => [1], 'x0' => 200.0, 'x1' => 260.0],
        ['surah' => 1, 'ayah' => 1, 'position' => 2, 'apps' => [2], 'line' => 1, 'contours' => [2], 'x0' => 100.0, 'x1' => 150.0],
        ['surah' => 1, 'ayah' => 1, 'position' => 3, 'apps' => [3], 'line' => 2, 'contours' => [4], 'x0' => 200.0, 'x1' => 260.0],
        ['surah' => 1, 'ayah' => 1, 'position' => 4, 'apps' => [4], 'line' => 2, 'contours' => [5], 'x0' => 100.0, 'x1' => 150.0],
    ];
    $loose ??= [['loose' => 0, 'contour' => 3, 'line' => 1, 'attach' => null, 'ornament' => false]];
    $marks ??= [['first' => 0, 'count' => 1, 'box' => [262.0, 44.0, 268.0, 52.0]]];
    $markSubpaths = array_sum(array_column($marks, 'count'));
    $content = [];

    foreach (array_keys($contours) as $c) {
        $content[] = $markSubpaths + $c;
    }

    return [
        'contours' => $contours,
        'lineOf' => $lineOf,
        'words' => $words,
        'loose' => $loose,
        'subpaths' => $markSubpaths + count($contours),
        'content' => $content,
        'marks' => $marks,
        'regions' => [
            ['surah' => 1, 'ayah' => 1, 'polygon' => 'M 90 35 270 35 270 75 90 75'],
            ['surah' => 1, 'ayah' => 1, 'polygon' => 'M 90 80 270 80 270 110 90 110'],
        ],
    ];
}

/**
 * @return array<string, array{page: int, box: array{0: float, 1: float, 2: float, 3: float}}>
 */
function contourLastWords(): array
{
    return ['1:1' => ['page' => 1, 'box' => [100.0, 80.0, 150.0, 110.0]]];
}

function buildContourMap(array $input, bool $requireSajda = false): ContourMap
{
    return ContourMapBuilder::build([1 => $input], contourLastWords(), 5.0, 36.3, $requireSajda);
}

it('assigns each word its subpaths and a loose mark to the nearest word of the line below, with no failed gate', function (): void {
    $map = buildContourMap(contourPageInput(loose: [['loose' => 0, 'contour' => 3, 'line' => 1, 'attach' => null, 'ornament' => false]]));

    expect($map->checks)->toBe(['W9' => 0, 'W10' => 0, 'W11' => 0])
        ->and($map->issues)->toBe([])
        ->and($map->wordRows)->toContain(
            ['surah' => 1, 'ayah' => 1, 'position' => 1, 'first' => 2, 'count' => 1, 'flag' => 0],
            ['surah' => 1, 'ayah' => 1, 'position' => 4, 'first' => 4, 'count' => 1, 'flag' => 1],
            ['surah' => 1, 'ayah' => 1, 'position' => 4, 'first' => 6, 'count' => 1, 'flag' => 0],
        )
        ->and($map->attachments)->toHaveCount(1)
        ->and($map->attachments[0]['target'])->toBe('1:1:4')
        ->and($map->attachments[0]['mode'])->toBe('nearest')
        ->and($map->attachments[0]['distance'])->toBe(9.0);
});

it('takes an explicit attach over the geometry', function (): void {
    $map = buildContourMap(contourPageInput(loose: [['loose' => 0, 'contour' => 3, 'line' => 1, 'attach' => '1:1:3', 'ornament' => false]]));

    expect($map->checks['W10'])->toBe(0)
        ->and($map->attachments[0]['target'])->toBe('1:1:3')
        ->and($map->attachments[0]['mode'])->toBe('explicit')
        ->and($map->wordRows)->toContain(['surah' => 1, 'ayah' => 1, 'position' => 3, 'first' => 4, 'count' => 1, 'flag' => 1]);
});

it('writes a hizb ornament as its own margin block anchored to the nearest word, never in a word run', function (): void {
    $map = buildContourMap(contourPageInput(loose: [['loose' => 0, 'contour' => 3, 'line' => 1, 'attach' => null, 'ornament' => true]]));

    expect($map->checks['W10'])->toBe(0)
        ->and($map->attachments)->toBe([])
        ->and($map->hizbOrnaments)->toBe(1)
        ->and(array_filter($map->wordRows, fn (array $row): bool => $row['first'] === 4))->toBe([])
        ->and($map->blockRows)->toContain(['page' => 1, 'kind' => 4, 'ord' => 0, 'surah' => 1, 'ayah' => 1, 'first' => 4, 'count' => 1, 'x0' => 3840, 'y0' => 2240, 'x1' => 4000, 'y1' => 2432]);
});

it('clusters out-of-band contours into one block when the gap is within a quarter line', function (): void {
    $contours = [
        [50.0, 10.0, 300.0, 20.0],
        [50.0, 22.0, 300.0, 30.0],
        [200.0, 45.0, 260.0, 60.0],
        [100.0, 45.0, 150.0, 60.0],
        [200.0, 85.0, 260.0, 105.0],
        [100.0, 85.0, 150.0, 105.0],
    ];
    $words = [
        ['surah' => 1, 'ayah' => 1, 'position' => 1, 'apps' => [1], 'line' => 1, 'contours' => [2], 'x0' => 200.0, 'x1' => 260.0],
        ['surah' => 1, 'ayah' => 1, 'position' => 2, 'apps' => [2], 'line' => 1, 'contours' => [3], 'x0' => 100.0, 'x1' => 150.0],
        ['surah' => 1, 'ayah' => 1, 'position' => 3, 'apps' => [3], 'line' => 2, 'contours' => [4], 'x0' => 200.0, 'x1' => 260.0],
        ['surah' => 1, 'ayah' => 1, 'position' => 4, 'apps' => [4], 'line' => 2, 'contours' => [5], 'x0' => 100.0, 'x1' => 150.0],
    ];
    $map = buildContourMap(contourPageInput($contours, [null, null, 1, 1, 2, 2], $words, loose: []));

    expect($map->checks['W10'])->toBe(0)
        ->and($map->blockRows)->toContain(['page' => 1, 'kind' => 1, 'ord' => 0, 'surah' => 0, 'ayah' => 0, 'first' => 1, 'count' => 2, 'x0' => 1600, 'y0' => 320, 'x1' => 9600, 'y1' => 960]);
});

it('records a sajda line as an annotation row, and keeps it in its word', function (): void {
    $contours = [
        [50.0, 10.0, 300.0, 20.0],
        [200.0, 45.0, 260.0, 60.0],
        [100.0, 45.0, 150.0, 60.0],
        [120.0, 70.0, 125.0, 76.0],
        [200.0, 85.0, 260.0, 105.0],
        [100.0, 85.0, 150.0, 105.0],
        [205.0, 95.0, 245.0, 96.0], // c6: a thin wide sajda line over word 1:1:3
    ];
    $words = [
        ['surah' => 1, 'ayah' => 1, 'position' => 1, 'apps' => [1], 'line' => 1, 'contours' => [1], 'x0' => 200.0, 'x1' => 260.0],
        ['surah' => 1, 'ayah' => 1, 'position' => 2, 'apps' => [2], 'line' => 1, 'contours' => [2], 'x0' => 100.0, 'x1' => 150.0],
        ['surah' => 1, 'ayah' => 1, 'position' => 3, 'apps' => [3], 'line' => 2, 'contours' => [4, 6], 'x0' => 200.0, 'x1' => 260.0],
        ['surah' => 1, 'ayah' => 1, 'position' => 4, 'apps' => [4], 'line' => 2, 'contours' => [5], 'x0' => 100.0, 'x1' => 150.0],
    ];
    $map = buildContourMap(contourPageInput($contours, [null, 1, 1, 1, 2, 2, 2], $words));

    expect($map->checks['W10'])->toBe(0)
        ->and($map->sajdaLines)->toBe(1)
        ->and($map->sajdaPages)->toBe(1)
        ->and($map->blockRows)->toContain(['page' => 1, 'kind' => 3, 'ord' => 0, 'surah' => 0, 'ayah' => 0, 'first' => 7, 'count' => 1, 'x0' => 6560, 'y0' => 3040, 'x1' => 7840, 'y1' => 3072])
        ->and($map->wordRows)->toContain(['surah' => 1, 'ayah' => 1, 'position' => 3, 'first' => 5, 'count' => 1, 'flag' => 0])
        ->and($map->wordRows)->toContain(['surah' => 1, 'ayah' => 1, 'position' => 3, 'first' => 7, 'count' => 1, 'flag' => 0]);
});

it('fails W9 when the ayah has no mark on the page', function (): void {
    $map = buildContourMap(contourPageInput(marks: []));

    expect($map->checks['W9'])->toBeGreaterThan(0)
        ->and($map->issues)->toContain('W9 page 1: 0 ayah marks for 1 ayahs ending here');
});

it('fails W10 when an in-band contour belongs to no word', function (): void {
    $contours = [
        [50.0, 10.0, 300.0, 20.0],
        [200.0, 45.0, 260.0, 60.0],
        [100.0, 45.0, 150.0, 60.0],
        [120.0, 70.0, 125.0, 76.0],
        [200.0, 85.0, 260.0, 105.0],
        [100.0, 85.0, 150.0, 105.0],
        [280.0, 85.0, 290.0, 95.0], // c6: in band 2, but no word or loose entry claims it
    ];
    $map = buildContourMap(contourPageInput($contours, [null, 1, 1, 1, 2, 2, 2]));

    expect($map->checks['W10'])->toBe(1)
        ->and($map->issues)->toContain('W10 page 1: subpath 7 is claimed 0 times');
});

it('fails W10 when a word does not span its own contours', function (): void {
    $words = [
        ['surah' => 1, 'ayah' => 1, 'position' => 1, 'apps' => [1], 'line' => 1, 'contours' => [1], 'x0' => 190.0, 'x1' => 260.0],
        ['surah' => 1, 'ayah' => 1, 'position' => 2, 'apps' => [2], 'line' => 1, 'contours' => [2], 'x0' => 100.0, 'x1' => 150.0],
        ['surah' => 1, 'ayah' => 1, 'position' => 3, 'apps' => [3], 'line' => 2, 'contours' => [4], 'x0' => 200.0, 'x1' => 260.0],
        ['surah' => 1, 'ayah' => 1, 'position' => 4, 'apps' => [4], 'line' => 2, 'contours' => [5], 'x0' => 100.0, 'x1' => 150.0],
    ];

    expect(buildContourMap(contourPageInput(words: $words))->checks['W10'])->toBe(1);
});

it('fails W11 for Hafs when the sajda count is not 15 on 15 pages, and only reports it otherwise', function (): void {
    expect(buildContourMap(contourPageInput(), true)->checks['W11'])->toBe(1)
        ->and(buildContourMap(contourPageInput(), false)->checks['W11'])->toBe(0);
});

it('names a word by its app positions and gives 15:7 contour rows for the first position only', function (): void {
    $words = [
        ['surah' => 1, 'ayah' => 1, 'position' => 1, 'apps' => [1, 2], 'line' => 1, 'contours' => [1, 2], 'x0' => 100.0, 'x1' => 260.0],
        ['surah' => 1, 'ayah' => 1, 'position' => 3, 'apps' => [3], 'line' => 2, 'contours' => [4], 'x0' => 200.0, 'x1' => 260.0],
        ['surah' => 1, 'ayah' => 1, 'position' => 4, 'apps' => [4], 'line' => 2, 'contours' => [5], 'x0' => 100.0, 'x1' => 150.0],
    ];
    $map = buildContourMap(contourPageInput(words: $words, loose: [['loose' => 0, 'contour' => 3, 'line' => 1, 'attach' => null, 'ornament' => false]]));

    expect(array_values(array_unique(array_column($map->wordRows, 'position'))))->toBe([1, 3, 4])
        ->and($map->wordRows)->toContain(['surah' => 1, 'ayah' => 1, 'position' => 1, 'first' => 2, 'count' => 2, 'flag' => 0]);
});

it('keeps the map rule as the digest version: the algorithm is 1', function (): void {
    expect(ContourMapBuilder::ALGORITHM)->toBe(1);
});

it('adds a keep-together block per run, sorted after the other kinds, and leaves the gates and words alone', function (): void {
    $map = new ContourMap([], [
        ['page' => 2, 'kind' => 2, 'ord' => 0, 'surah' => 1, 'ayah' => 1, 'first' => 0, 'count' => 1, 'x0' => 0, 'y0' => 0, 'x1' => 1, 'y1' => 1],
    ], ['W9' => 0, 'W10' => 0, 'W11' => 0], [], [], 0, 0, 0);

    $kept = ContourMapBuilder::withKeepTogether($map, [
        2 => [['surah' => 1, 'ayah' => 1, 'first' => 3, 'count' => 2, 'box' => [10.0, 20.0, 30.5, 40.0]]],
        1 => [['surah' => 1, 'ayah' => 2, 'first' => 1, 'count' => 3, 'box' => [1.0, 2.0, 3.0, 4.0]]],
    ]);

    expect($kept->blockRows)->toBe([
        ['page' => 1, 'kind' => 5, 'ord' => 0, 'surah' => 1, 'ayah' => 2, 'first' => 1, 'count' => 3, 'x0' => 32, 'y0' => 64, 'x1' => 96, 'y1' => 128],
        ['page' => 2, 'kind' => 2, 'ord' => 0, 'surah' => 1, 'ayah' => 1, 'first' => 0, 'count' => 1, 'x0' => 0, 'y0' => 0, 'x1' => 1, 'y1' => 1],
        ['page' => 2, 'kind' => 5, 'ord' => 0, 'surah' => 1, 'ayah' => 1, 'first' => 3, 'count' => 2, 'x0' => 320, 'y0' => 640, 'x1' => 976, 'y1' => 1280],
    ])->and($kept->checks)->toBe($map->checks)
        ->and($kept->wordRows)->toBe([]);
});

it('keeps a title the source draws in two runs as one block: a kind 1 row and a kind 6 row naming it', function (): void {
    // The title's two pieces (c0, c2) are split in path order by a word's contour (c1), as the other riwayat draw them.
    $input = contourPageInput(
        contours: [
            [50.0, 10.0, 150.0, 20.0], [200.0, 45.0, 260.0, 60.0], [160.0, 12.0, 300.0, 20.0],
            [100.0, 45.0, 150.0, 60.0], [200.0, 85.0, 260.0, 105.0], [100.0, 85.0, 150.0, 105.0],
        ],
        lineOf: [null, 1, null, 1, 2, 2],
        words: [
            ['surah' => 1, 'ayah' => 1, 'position' => 1, 'apps' => [1], 'line' => 1, 'contours' => [1], 'x0' => 200.0, 'x1' => 260.0],
            ['surah' => 1, 'ayah' => 1, 'position' => 2, 'apps' => [2], 'line' => 1, 'contours' => [3], 'x0' => 100.0, 'x1' => 150.0],
            ['surah' => 1, 'ayah' => 1, 'position' => 3, 'apps' => [3], 'line' => 2, 'contours' => [4], 'x0' => 200.0, 'x1' => 260.0],
            ['surah' => 1, 'ayah' => 1, 'position' => 4, 'apps' => [4], 'line' => 2, 'contours' => [5], 'x0' => 100.0, 'x1' => 150.0],
        ],
        loose: [],
    );

    $map = buildContourMap($input);
    $blocks = array_values(array_filter($map->blockRows, fn (array $row): bool => in_array($row['kind'], [1, 6], true)));

    expect($map->checks['W10'])->toBe(0)
        ->and(array_map(fn (array $row): array => [$row['kind'], $row['ord'], $row['ayah'], $row['first'], $row['count']], $blocks))
        ->toBe([[1, 0, 0, 1, 1], [6, 0, 0, 3, 1]]);
});

it('lets a subpath that draws nothing (an empty moveto) stay unclaimed, and only that', function (): void {
    $input = contourPageInput();
    $input['subpaths']++;

    expect(buildContourMap($input)->checks['W10'])->toBe(1)
        ->and(buildContourMap([...$input, 'empty' => [$input['subpaths'] - 1]])->checks['W10'])->toBe(0);
});
