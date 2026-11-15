<?php

declare(strict_types=1);

use App\Domains\Azkar\Services\QuranWordRunFinder;
use App\Support\QuranText\QuranWordMap;
use App\Support\QuranText\SearchTextNormalizer;

/*
| ADR 0093: a quoted span is located as a run of whole words inside one surah. Placeholder words only («تجريبي» = test
| word, not Quran): the finder works on any text, and the Quran itself is covered by the Feature tests.
|
|   1:1 = [تجريبي١, تجريبي٢, تجريبي٣]     1:2 = [تجريبي٤, تجريبي٢]
|   2:1 = [تجريبي٥, تجريبي٦]              2:2 = [تجريبي٧]
|   3:1 = [تجريبي٢ تجريبي٣]  (one position holding two tokens, like a merged word)
*/

function wrfFinder(): QuranWordRunFinder
{
    return new QuranWordRunFinder(new QuranWordMap([
        '1:1' => ['تجريبي١', 'تجريبي٢', 'تجريبي٣'],
        '1:2' => ['تجريبي٤', 'تجريبي٢'],
        '2:1' => ['تجريبي٥', 'تجريبي٦'],
        '2:2' => ['تجريبي٧'],
        '3:1' => ['تجريبي٢ تجريبي٣'],
    ]), new SearchTextNormalizer);
}

it('finds a run inside one verse with its word positions', function (): void {
    expect(wrfFinder()->find('تجريبي١ تجريبي٢'))->toBe([
        ['surah' => 1, 'verse_from' => 1, 'word_from' => 1, 'verse_to' => 1, 'word_to' => 2],
    ]);
});

it('finds a run that crosses from one verse into the next verse of the same surah', function (): void {
    expect(wrfFinder()->find('تجريبي٣ تجريبي٤'))->toBe([
        ['surah' => 1, 'verse_from' => 1, 'word_from' => 3, 'verse_to' => 2, 'word_to' => 1],
    ]);
});

it('returns every place a span occurs, so a caller can refuse an ambiguous span', function (): void {
    $runs = wrfFinder()->find('تجريبي٢');

    expect($runs)->toHaveCount(2)
        ->and(array_column($runs, 'verse_from'))->toBe([1, 2]);
});

it('never starts or ends a run inside a word with two tokens', function (): void {
    // The second token of 3:1 is the end of a word but not its start, so it matches nothing alone.
    expect(wrfFinder()->find('تجريبي٣'))->toBe([
        ['surah' => 1, 'verse_from' => 1, 'word_from' => 3, 'verse_to' => 1, 'word_to' => 3],
    ]);
});

it('finds a whole word that has two tokens', function (): void {
    expect(wrfFinder()->find('تجريبي٢ تجريبي٣'))->toContain(
        ['surah' => 3, 'verse_from' => 1, 'word_from' => 1, 'verse_to' => 1, 'word_to' => 1],
    );
});

it('never crosses a surah boundary', function (): void {
    expect(wrfFinder()->find('تجريبي٤ تجريبي٥'))->toBe([]);
});

it('finds nothing for an empty span or text that is not in the map', function (string $span): void {
    expect(wrfFinder()->find($span))->toBe([]);
})->with([
    'empty' => [''],
    'spaces only' => ['   '],
    'placeholder not in the map' => ['غير موجود ١'],
]);
