<?php

declare(strict_types=1);

use App\Domains\Mushaf\Exceptions\SvgMushafSourceException;
use App\Domains\Mushaf\WordBoxes\LineBands;
use App\Domains\Mushaf\WordBoxes\LineOrder;
use App\Domains\Mushaf\WordBoxes\PageContours;
use App\Domains\Mushaf\WordBoxes\SvgPathBounds;
use App\Domains\Mushaf\WordBoxes\WordBoxOverrides;
use App\Domains\Mushaf\WordBoxes\WordSplitter;

// Synthetic shapes and placeholder tokens only: no Quran artwork, no Quran text.

describe('path parser', function (): void {
    it('gives each subpath its box from endpoints and control points', function (string $d, array $boxes): void {
        expect(SvgPathBounds::contours($d))->toEqualWithDelta($boxes, 1e-9);
    })->with([
        'absolute' => ['M0 0 L10 0 L10 5 Z', [[0.0, 0.0, 10.0, 5.0]]],
        'relative with implicit repeats after m' => ['m1 1 2 0 0 3z', [[1.0, 1.0, 3.0, 4.0]]],
        'z returns to the subpath start' => ['m1 1 l2 0 z m1 1 l0 1', [[1.0, 1.0, 3.0, 1.0], [2.0, 2.0, 2.0, 3.0]]],
        'a drawing command after z starts at the start point' => ['M1 1 L3 1 Z l0 2', [[1.0, 1.0, 3.0, 1.0], [1.0, 1.0, 1.0, 3.0]]],
        'exponents, joined negatives and .5.5' => ['M1e1-2.5L.5.5l-0.5-0.5', [[0.0, -2.5, 10.0, 0.5]]],
        'h and v, both cases' => ['M0 0h4v-3H1V2', [[0.0, -3.0, 4.0, 2.0]]],
        's, q and t, relative' => ['M0 0s2 4 6 0q1 -5 2 0t3 1', [[0.0, -5.0, 11.0, 4.0]]],
        'c keeps control points relative to the segment start' => ['M10 10c1 -9 2 9 3 0 1 1 2 2 3 3', [[10.0, 1.0, 16.0, 19.0]]],
        'a with packed flags' => ['M0 0a5 5 0 011 2', [[0.0, 0.0, 1.0, 2.0]]],
        'a moveto that draws nothing is not a contour' => ['M5 5 M0 0 L1 1', [[0.0, 0.0, 1.0, 1.0]]],
    ]);

    it('refuses numbers before any command', function (): void {
        SvgPathBounds::contours('5 5 L1 1');
    })->throws(SvgMushafSourceException::class);
});

describe('transform chain', function (): void {
    it('applies the inner translate, then the root y-flipping matrix, and skips the ayah markers', function (): void {
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 345 550"><g transform="matrix(2 0 0 -2 10 100)">'
            .'<g id="ayah_markers"><g transform="translate(1 1)"><path d="M0 0 L50 50"/></g></g>'
            .'<g id="content"><g transform="translate(5,10)"><path d="M0 0 L4 0 L4 3 Z m1 1 l1 0 l0 1"/></g></g>'
            .'</g><path class="ayahPolygon" d="M 0 0 L 9 9 L 9 0 Z"/></svg>';

        // Local [0,0,4,3] → translate → [5,10,9,13] → x' = 2x + 10, y' = -2y + 100 → [20,74,28,80]. The second subpath is relative
        // to the first's start: [1,1,2,2] → [6,11,7,12] → [22,76,24,78].
        expect(PageContours::fromSvg($svg))->toEqualWithDelta([[20.0, 74.0, 28.0, 80.0], [22.0, 76.0, 24.0, 78.0]], 1e-9);
    });

    it('refuses a transform it cannot apply', function (): void {
        PageContours::parseTransform('rotate(30)');
    })->throws(SvgMushafSourceException::class);
});

describe('line bands', function (): void {
    it('splits a two-line rectangle into two bands and merges a neighbour that overlaps one', function (): void {
        $bands = LineBands::fromRegions([
            ['surah' => 1, 'ayah' => 1, 'polygon' => 'M 0 0 L 100 0 L 100 20 L 0 20 Z'],
            ['surah' => 1, 'ayah' => 2, 'polygon' => 'M 0 20 L 100 20 L 100 60 L 0 60 Z'],
            ['surah' => 1, 'ayah' => 3, 'polygon' => 'M 0 60 L 50 60 L 50 80 L 0 80 Z'],
            ['surah' => 1, 'ayah' => 4, 'polygon' => 'M 50 60.3 L 100 60.3 L 100 80.2 L 50 80.2 Z'],
        ], 5.0, 20.0);

        expect($bands->bands)->toBe([[0.0, 20.0], [20.0, 40.0], [40.0, 60.0], [60.0, 80.0]])
            ->and($bands->span(1, 2, 50.0, 0.5))->toBe([0.0, 100.0])
            ->and($bands->span(1, 3, 70.0, 0.5))->toBe([0.0, 50.0])
            ->and($bands->span(1, 1, 50.0, 0.5))->toBeNull()
            ->and($bands->bandAt(45.0))->toBe(2)
            ->and($bands->bandAt(85.0))->toBeNull();
    });

    it('cuts a bare polygon into one rectangle per line at the snapped line edges', function (): void {
        $polygon = '60,0 0,0 0,19.6 100,20.4 100,40 50,40 50,20.2 59.8,20';
        $levels = LineBands::levels([$polygon], 5.0);

        expect($levels)->toEqualWithDelta([0.0, 20.0, 40.0], 1e-9)
            ->and(LineBands::rects($polygon, $levels))->toEqualWithDelta([[0.0, 0.0, 59.9, 20.0], [50.0, 20.0, 100.0, 40.0]], 1e-9)
            ->and(LineBands::fromRegions([['surah' => 1, 'ayah' => 1, 'polygon' => $polygon]], 5.0, 20.0)->bands)->toBe([[0.0, 20.0], [20.0, 40.0]]);
    });

    it('takes one line height for the edition: the median of its single-line rectangles', function (): void {
        // The 25th percentile is 20, so rectangles under 30 are single lines; their median is (20 + 20) / 2.
        expect(LineBands::lineHeight([40.0, 20.5, 19.5, 61.0, 20.0, 20.0]))->toBe(20.0)
            ->and(LineBands::lineHeight([]))->toBe(0.0);
    });
});

describe('line order', function (): void {
    $contour = fn (float $x0, float $x1): array => [$x0, 0.0, $x1, 10.0];

    it('reverses a line whose path runs right to left', function () use ($contour): void {
        $order = LineOrder::normalise([$contour(70, 90), $contour(40, 60), $contour(10, 30)], 120.0);

        expect($order['contours'])->toBe([$contour(10, 30), $contour(40, 60), $contour(70, 90)])
            ->and($order['reversed'])->toBeTrue()
            ->and($order['contiguous'])->toBeTrue();
    });

    it('moves a stray contour drawn first to where its x puts it', function () use ($contour): void {
        $line = [$contour(300, 310)];

        for ($i = 0; $i < 9; $i++) {
            $line[] = $contour(10 + 30 * $i, 25 + 30 * $i);
        }

        $order = LineOrder::normalise($line, 120.0);

        expect($order['contours'])->toBe([...array_slice($line, 1), $line[0]])
            ->and($order['reversed'])->toBeFalse()
            ->and($order['contiguous'])->toBeTrue();
    });

    it('reports a line whose left edges still fall back too far', function () use ($contour): void {
        expect(LineOrder::normalise([$contour(10, 20), $contour(100, 110), $contour(20, 180)], 60.0)['contiguous'])->toBeFalse();
    });

    it('gives the input position of every normalised contour, a permutation of the input', function () use ($contour): void {
        $reversed = LineOrder::normalise([$contour(70, 90), $contour(40, 60), $contour(10, 30)], 120.0);
        $stray = [$contour(10, 25), $contour(40, 55), $contour(300, 310), $contour(70, 85)];
        $merged = LineOrder::normalise($stray, 120.0);

        expect($reversed['order'])->toBe([2, 1, 0])
            ->and($merged['order'])->toBe([0, 1, 3, 2])
            ->and($merged['contours'])->toBe([$contour(10, 25), $contour(40, 55), $contour(70, 85), $contour(300, 310)])
            ->and(LineOrder::normalise([], 120.0)['order'])->toBe([])
            ->and(LineOrder::normalise([$contour(1, 2)], 120.0)['order'])->toBe([0]);

        foreach ([$reversed, $merged] as $order) {
            $sorted = $order['order'];
            sort($sorted);
            expect($sorted)->toBe(range(0, count($order['order']) - 1));
        }
    });
});

describe('overrides', function (): void {
    $file = function (mixed $overrides, mixed $needsDeveloper = [], mixed $wordLines = []): string {
        $path = sys_get_temp_dir().'/word-box-overrides-'.getmypid().'-'.bin2hex(random_bytes(4)).'.json';
        file_put_contents($path, json_encode(['overrides' => $overrides, 'needs_developer' => $needsDeveloper, 'word_lines' => $wordLines], JSON_THROW_ON_ERROR));

        return $path;
    };

    it('reads groups per page and line', function () use ($file): void {
        $path = $file(['12:3' => ['contours' => 3, 'groups' => [[0, 2], [1]], 'reason' => 'FIXTURE']]);

        expect(WordBoxOverrides::fromFile($path)->for(12, 3))->toBe(['contours' => 3, 'groups' => [[0, 2], [1]], 'loose' => [], 'reason' => 'FIXTURE', 'attach' => [], 'ornaments' => []])
            ->and(WordBoxOverrides::fromFile($path)->for(12, 4))->toBeNull()
            ->and(WordBoxOverrides::fromFile('/nonexistent/overrides.json')->lines)->toBe([]);

        unlink($path);
    });

    it('reads contours that belong to no word, and lines left to the developer', function () use ($file): void {
        $path = $file(['12:3' => ['contours' => 4, 'groups' => [[0], [2, 3]], 'loose' => [1], 'reason' => 'FIXTURE']], ['12:4' => 'FIXTURE note']);
        $overrides = WordBoxOverrides::fromFile($path);

        expect($overrides->for(12, 3))->toBe(['contours' => 4, 'groups' => [[0], [2, 3]], 'loose' => [1], 'reason' => 'FIXTURE', 'attach' => [], 'ornaments' => []])
            ->and($overrides->for(12, 4))->toBeNull()
            ->and($overrides->needsDeveloper)->toBe(['12:4' => 'FIXTURE note']);

        unlink($path);
    });

    it('reads a word the artwork draws on another line', function () use ($file): void {
        $path = $file([], [], ['5:6:7' => ['page' => 9, 'from' => 3, 'to' => 4, 'reason' => 'FIXTURE']]);

        expect(WordBoxOverrides::fromFile($path)->wordLines)->toBe(['5:6:7' => ['page' => 9, 'from' => 3, 'to' => 4, 'reason' => 'FIXTURE']]);

        unlink($path);
    });

    it('refuses a word-line correction with no reason, the same line twice or a bad key', function (mixed $wordLines) use ($file): void {
        $path = $file([], [], $wordLines);

        try {
            WordBoxOverrides::fromFile($path);
        } finally {
            unlink($path);
        }
    })->with([
        'no reason' => [['5:6:7' => ['page' => 9, 'from' => 3, 'to' => 4]]],
        'same line' => [['5:6:7' => ['page' => 9, 'from' => 3, 'to' => 3, 'reason' => 'FIXTURE']]],
        'bad key' => [['5:6' => ['page' => 9, 'from' => 3, 'to' => 4, 'reason' => 'FIXTURE']]],
    ])->throws(SvgMushafSourceException::class);

    it('refuses a line both overridden and left to the developer, or left with no note', function (mixed $needsDeveloper) use ($file): void {
        $path = $file(['1:1' => ['contours' => 1, 'groups' => [[0]], 'reason' => 'FIXTURE']], $needsDeveloper);

        try {
            WordBoxOverrides::fromFile($path);
        } finally {
            unlink($path);
        }
    })->with([
        'both' => [['1:1' => 'FIXTURE note']],
        'no note' => [['1:2' => ' ']],
        'bad key' => [['line 2' => 'FIXTURE note']],
    ])->throws(SvgMushafSourceException::class);

    it('refuses an entry that is not a partition of the line\'s contours or has no reason', function (mixed $entry) use ($file): void {
        $path = $file(['1:1' => $entry]);

        try {
            WordBoxOverrides::fromFile($path);
        } finally {
            unlink($path);
        }
    })->with([
        'index used twice' => [['contours' => 2, 'groups' => [[0], [0]], 'reason' => 'FIXTURE']],
        'index out of range' => [['contours' => 2, 'groups' => [[0], [2]], 'reason' => 'FIXTURE']],
        'contour left out' => [['contours' => 3, 'groups' => [[0], [1]], 'reason' => 'FIXTURE']],
        'no reason' => [['contours' => 2, 'groups' => [[0], [1]]]],
        'empty group' => [['contours' => 1, 'groups' => [[0], []], 'reason' => 'FIXTURE']],
        'loose index also in a word' => [['contours' => 2, 'groups' => [[0], [1]], 'loose' => [1], 'reason' => 'FIXTURE']],
        'loose not a list' => [['contours' => 2, 'groups' => [[0], [1]], 'loose' => 1, 'reason' => 'FIXTURE']],
    ])->throws(SvgMushafSourceException::class);
});

describe('split', function (): void {
    it('groups each word with its marks, the mark between two words going to the nearer one', function (): void {
        $contours = [[0.0, 0.0, 8.0, 10.0], [3.0, 7.0, 5.0, 9.0], [12.0, 0.0, 20.0, 10.0], [21.0, 7.0, 22.0, 9.0], [26.0, 0.0, 35.0, 10.0]];
        $base = [true, false, true, false, true];

        expect(WordSplitter::split($contours, [[0.0, 9.0], [11.0, 23.0], [25.0, 36.0]], $base, 0.5, 1000.0, 500.0))
            ->toBe([[0, 2], [2, 4], [4, 5]]);
    });

    it('lets a span outweigh a narrower split that puts a word outside it', function (): void {
        $contours = [[0.0, 0.0, 10.0, 10.0], [11.0, 0.0, 12.0, 10.0], [20.0, 0.0, 30.0, 10.0]];
        $base = [true, true, true];

        expect(WordSplitter::split($contours, [[-1000.0, 1000.0], [-1000.0, 1000.0]], $base, 0.5, 1000.0, 500.0))->toBe([[0, 2], [2, 3]])
            ->and(WordSplitter::split($contours, [[0.0, 5.2], [11.0, 30.0]], $base, 0.5, 1000.0, 500.0))->toBe([[0, 1], [1, 3]]);
    });

    it('avoids a group with no full-height contour, even when it would be narrower', function (): void {
        $contours = [[0.0, 0.0, 10.0, 10.0], [12.0, 0.0, 22.0, 10.0], [40.0, 7.0, 41.0, 9.0]];
        $base = [true, true, false];

        expect(WordSplitter::split($contours, [null, null], $base, 0.5, 1000.0, 500.0))->toBe([[0, 1], [1, 3]])
            ->and(WordSplitter::split($contours, [null, null], $base, 0.5, 0.0, 500.0))->toBe([[0, 2], [2, 3]]);
    });

    it('cannot split fewer contours than words', function (): void {
        expect(WordSplitter::split([[0.0, 0.0, 1.0, 1.0]], [null, null], [true], 0.5, 1000.0, 500.0))->toBeNull();
    });
});
