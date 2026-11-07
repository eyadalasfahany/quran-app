<?php

declare(strict_types=1);

use App\Domains\Hadith\Services\HadithBookTitleMatcher;
use App\Domains\Hadith\Services\HadithSectionTitleMatcher;

/*
| The book-title matcher (hadith:match-book-titles, ADR 0042 §4a, ADR 0076). Pure: placeholder numbers and titles only.
*/

function bookTitleMatcher(): HadithBookTitleMatcher
{
    return new HadithBookTitleMatcher(new HadithSectionTitleMatcher);
}

/**
 * @param  list<string>  $range
 * @return list<string>
 */
function numbersFrom(int $first, int $last): array
{
    return array_map('strval', range($first, $last));
}

it('accepts a section and an OpenITI book that agree at 95% both ways, and rejects one that does not', function (): void {
    $sections = [
        '1' => numbersFrom(1, 20),
        '2' => numbersFrom(21, 40),
    ];
    $books = [
        ['ordinal' => 1, 'title' => 'FIXTURE book title 1', 'numbers' => [...numbersFrom(1, 19), '100']],
        ['ordinal' => 2, 'title' => 'FIXTURE book title 2', 'numbers' => [...numbersFrom(21, 38), '200', '201']],
    ];

    $matches = bookTitleMatcher()->match($sections, $books, []);
    $byBook = [];

    foreach ($matches as $match) {
        $byBook[$match->bookNumber] = $match;
    }

    expect($byBook['1']->accepted)->toBeTrue()
        ->and($byBook['1']->titleAr)->toBe('FIXTURE book title 1')
        ->and($byBook['1']->chapterNumber)->toBe('b1')
        ->and($byBook['2']->accepted)->toBeFalse()
        ->and($byBook['2']->reason)->toBe('forward_below_threshold');
});

it('never proposes a section that already has a title', function (): void {
    $sections = ['1' => numbersFrom(1, 20), '2' => numbersFrom(21, 40)];
    $books = [
        ['ordinal' => 1, 'title' => 'FIXTURE book title 1', 'numbers' => numbersFrom(1, 20)],
        ['ordinal' => 2, 'title' => 'FIXTURE book title 2', 'numbers' => numbersFrom(21, 40)],
    ];

    $matches = bookTitleMatcher()->match($sections, $books, ['1']);

    expect(array_map(static fn ($match): string => $match->bookNumber, $matches))->toBe(['2'])
        ->and($matches[0]->accepted)->toBeTrue()
        ->and($matches[0]->titleAr)->toBe('FIXTURE book title 2');
});

it('rejects a section whose numbers an OpenITI book shares only below the threshold', function (): void {
    $sections = ['1' => numbersFrom(1, 20)];
    $books = [['ordinal' => 1, 'title' => 'FIXTURE book title 1', 'numbers' => numbersFrom(1, 18)]];

    $matches = bookTitleMatcher()->match($sections, $books, []);

    expect($matches[0]->accepted)->toBeFalse()
        ->and($matches[0]->reason)->toBe('forward_below_threshold');
});

it('does not count a number that two OpenITI books both hold, so the section is not matched', function (): void {
    $sections = ['1' => numbersFrom(1, 2)];
    $books = [
        ['ordinal' => 1, 'title' => 'FIXTURE book title 1', 'numbers' => ['1', '2']],
        ['ordinal' => 2, 'title' => 'FIXTURE book title 2', 'numbers' => ['1', '2']],
    ];

    $matches = bookTitleMatcher()->match($sections, $books, []);

    expect($matches[0]->accepted)->toBeFalse()
        ->and($matches[0]->reason)->toBe('no_chapter_mapped');
});
