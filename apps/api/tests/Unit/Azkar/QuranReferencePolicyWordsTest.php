<?php

declare(strict_types=1);

use App\Domains\Azkar\Services\QuranReferencePolicy;
use App\Support\QuranText\QuranWordMap;

/*
| ADR 0093: a row may carry `words` for a partial verse. The counts come from the word map, here a placeholder map:
| 2:1 has 3 words, 2:2 has 2 words, 2:3 has 4 words. Shape and count checks are in parse(); decide() is in Feature tests.
*/

function qwpPolicy(): QuranReferencePolicy
{
    return new QuranReferencePolicy(new QuranWordMap([
        '2:1' => ['ت١', 'ت٢', 'ت٣'],
        '2:2' => ['ت٤', 'ت٥'],
        '2:3' => ['ت٦', 'ت٧', 'ت٨', 'ت٩'],
    ]));
}

it('parses a partial row into one range that carries its word pair', function (array $row, array $expected): void {
    expect(qwpPolicy()->parse($row))->not->toBeNull()
        ->and(qwpPolicy()->parse($row)['ranges'])->toBe($expected);
})->with([
    'from a word in one verse, to the end' => [
        [2, 1, null, 'status' => 'reviewed', 'evidence' => 'test', 'words' => [2, null]],
        [[2, 1, null, [2, null]]],
    ],
    'to a word in one verse, from the start' => [
        [2, 3, null, 'status' => 'reviewed', 'evidence' => 'test', 'words' => [null, 2]],
        [[2, 3, null, [null, 2]]],
    ],
    'the same verse, both ends' => [
        [2, 1, null, 'status' => 'reviewed', 'evidence' => 'test', 'words' => [2, 3]],
        [[2, 1, null, [2, 3]]],
    ],
    'across two verses, each end in its verse' => [
        [2, 1, 2, 'status' => 'reviewed', 'evidence' => 'test', 'words' => [3, 1]],
        [[2, 1, 2, [3, 1]]],
    ],
]);

it('keeps a whole-verse row exactly as before (no words key, no fourth item)', function (): void {
    expect(qwpPolicy()->parse([2, 1, null, 'status' => 'reviewed', 'evidence' => 'test'])['ranges'])
        ->toBe([[2, 1, null]]);
});

it('refuses a word position that is not a word of its verse', function (array $row): void {
    expect(qwpPolicy()->parse($row))->toBeNull();
})->with([
    'zero' => [[2, 1, null, 'status' => 'reviewed', 'evidence' => 'test', 'words' => [0, null]]],
    'beyond the verse count (3 words)' => [[2, 1, null, 'status' => 'reviewed', 'evidence' => 'test', 'words' => [4, null]]],
    'word_to beyond the verse count (2 words)' => [[2, 2, null, 'status' => 'reviewed', 'evidence' => 'test', 'words' => [null, 3]]],
    'word_to beyond the last verse of the range' => [[2, 1, 2, 'status' => 'reviewed', 'evidence' => 'test', 'words' => [1, 5]]],
    'a string, not an integer' => [[2, 1, null, 'status' => 'reviewed', 'evidence' => 'test', 'words' => ['2', null]]],
    'both null (a whole verse has no words key)' => [[2, 1, null, 'status' => 'reviewed', 'evidence' => 'test', 'words' => [null, null]]],
    'word_to before word_from in one verse' => [[2, 1, null, 'status' => 'reviewed', 'evidence' => 'test', 'words' => [3, 2]]],
    'one item only' => [[2, 1, null, 'status' => 'reviewed', 'evidence' => 'test', 'words' => [2]]],
    'a verse not in the map' => [[2, 9, null, 'status' => 'reviewed', 'evidence' => 'test', 'words' => [1, null]]],
    'a verse of the range not in the map' => [[2, 2, 9, 'status' => 'reviewed', 'evidence' => 'test', 'words' => [1, 1]]],
    'with ranges as well' => [[2, 1, null, 'status' => 'reviewed', 'evidence' => 'test', 'words' => [2, null], 'ranges' => [[2, 1, null]]]],
]);
