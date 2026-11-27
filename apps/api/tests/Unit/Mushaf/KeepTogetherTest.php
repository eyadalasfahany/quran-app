<?php

declare(strict_types=1);

use App\Domains\Mushaf\WordBoxes\KeepTogether;

// Synthetic boxes and counts only: FIXTURE — not artwork, no Quran text. Boxes run left to right, as a line's boxes do, so the
// later word (the higher position) is on the left.

/**
 * @param  list<array{0: int, 1: float, 2: float, 3: int, 4: int, 5: list<float>}>  $words  [position, x0, x1, text bodies, drawn bodies, body centres]
 * @return list<array{surah: int, ayah: int, first: int, count: int, box: array{0: float, 1: float, 2: float, 3: float}}>
 */
function keepRuns(array $words, int $ayah = 1, array $ayahs = [], array $shared = []): array
{
    $boxes = [];
    $contours = [];
    $perLetter = [];
    $counts = [];

    foreach ($words as $i => [$position, $x0, $x1, $text, $drawn, $centres]) {
        $boxes[] = ['line' => 1, 'surah' => 1, 'ayah' => $ayahs[$i] ?? $ayah, 'position' => $position, 'x0' => $x0, 'y0' => 0.0, 'x1' => $x1, 'y1' => 30.0];
        $contours[] = ['apps' => [$position]];
        $perLetter[$i] = ($x1 - $x0) / 4;
        $counts[] = ['text' => $text, 'drawn' => $drawn, 'centres' => $centres];
    }

    return KeepTogether::runs($boxes, $contours, $perLetter, 5.0, $counts, $shared, 0.7, 1.4);
}

it('keeps ordinary neighbours apart', function (): void {
    expect(keepRuns([[2, 0.0, 20.0, 1, 1, [10.0]], [1, 24.0, 44.0, 1, 1, [34.0]]]))->toBe([]);
});

it('keeps a word whose letter sits inside its neighbour with that neighbour (the 1:1 case)', function (): void {
    // Word 4 is one letter drawn inside word 3's span: its letter is right of word 3's leftmost letter.
    $runs = keepRuns([[3, 0.0, 60.0, 2, 2, [10.0, 40.0]], [4, 30.0, 34.0, 1, 1, [32.0]]]);

    expect($runs)->toBe([['surah' => 1, 'ayah' => 1, 'first' => 3, 'count' => 2, 'box' => [0.0, 0.0, 60.0, 30.0]]]);
});

it('keeps neighbours together when their letters interleave, even with no box inside the other', function (): void {
    // The later word (2) has a letter at x 25, right of the earlier word's leftmost letter at x 22.
    expect(keepRuns([[2, 0.0, 26.0, 2, 2, [8.0, 25.0]], [1, 20.0, 44.0, 1, 1, [22.0, 34.0]]]))->toHaveCount(1);
});

it('keeps neighbours together when one misses a letter body and the other has one too many', function (): void {
    expect(keepRuns([[2, 0.0, 30.0, 1, 2, [5.0, 25.0]], [1, 31.0, 50.0, 2, 1, [40.0]]]))->toHaveCount(1);
});

it('keeps a narrow word with a missing body next to a wide one (one drawn shape)', function (): void {
    // Per letter: 3 / 5 = 0.6 of the median (narrow), 10 / 5 = 2 (wide).
    expect(keepRuns([[2, 0.0, 40.0, 1, 1, [20.0]], [1, 41.0, 53.0, 2, 1, [47.0]]]))->toHaveCount(1);
});

it('keeps neighbours together when they share an unclear mark (6:6)', function (): void {
    $words = [[2, 0.0, 20.0, 1, 1, [10.0]], [1, 24.0, 44.0, 1, 1, [34.0]]];

    expect(keepRuns($words))->toBe([])
        ->and(keepRuns($words, shared: [true, false]))->toHaveCount(1);
});

it('keeps every word between two words when one lies inside the other, even when they are not neighbours', function (): void {
    // Word 3's box (0 to 60) holds word 1 (40 to 50); word 2 sits between them.
    $runs = keepRuns([[3, 0.0, 60.0, 1, 1, [10.0]], [2, 61.0, 62.0, 1, 1, [61.5]], [1, 40.0, 50.0, 1, 1, [45.0]]]);

    expect($runs)->toHaveCount(1)
        ->and($runs[0]['first'])->toBe(1)
        ->and($runs[0]['count'])->toBe(3);
});

it('never joins words of different ayahs', function (): void {
    expect(keepRuns([[1, 0.0, 60.0, 2, 2, [10.0, 40.0]], [5, 30.0, 34.0, 1, 1, [32.0]]], ayahs: [2, 1]))->toBe([]);
});

it('chains neighbouring pairs into one run in app positions', function (): void {
    $runs = keepRuns([
        // Word 3 has a letter at 30, right of word 2's leftmost at 27; word 2 has one at 46, right of word 1's leftmost at 42.
        [3, 0.0, 31.0, 2, 2, [15.0, 30.0]],
        [2, 25.0, 48.0, 2, 2, [27.0, 46.0]],
        [1, 40.0, 70.0, 2, 2, [42.0, 60.0]],
    ]);

    expect($runs)->toHaveCount(1)
        ->and($runs[0]['first'])->toBe(1)
        ->and($runs[0]['count'])->toBe(3);
});
