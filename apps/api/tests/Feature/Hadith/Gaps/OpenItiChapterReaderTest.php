<?php

declare(strict_types=1);

use App\Domains\Hadith\Overlay\OpenItiChapterReader;
use App\Domains\Hadith\Overlay\OpenItiHeadingCleaner;
use App\Domains\Hadith\Overlay\OpenItiUnitReader;

/*
| The chapter scanner (ADR 0076 §5, brief 9.2 and 9.3, step 6b.7). Placeholder markup and placeholder titles only.
*/

const SCAN_UNIT = '/^### \| ?([0-9]+) ?- /u';

const SCAN_STOP = '/^###/u';

const SCAN_CHAPTER = '/^### \| ?(?![0-9])(.+)$/u';

const SCAN_BOOK = '/^### \$ (.+)$/u';

function chapterScanReader(): OpenItiChapterReader
{
    return new OpenItiChapterReader(new OpenItiUnitReader, new OpenItiHeadingCleaner);
}

/**
 * @return array{bytes: string}
 */
function chapterScanFixture(): string
{
    return implode("\n", [
        '#META#Header#End#',
        '### | FIXTURE chapter title 1',
        '### | 1 - FIXTURE text 1 — not a hadith',
        '### | 2 - FIXTURE text 2 — not a hadith',
        '### $ FIXTURE book title 1',
        '### | FIXTURE chapter title 2',
        '### | FIXTURE chapter title 3',
        '### | 3 - FIXTURE text 3 — not a hadith',
        '### | كتاب FIXTURE book word',
        '### | FIXTURE chapter title 4',
        '~~ FIXTURE continuation',
        '### | 4 - FIXTURE text 4 — not a hadith',
        'PageV01P001',
        '',
    ]);
}

it('a chapter heading starts a chapter and holds its numbered units', function (): void {
    $scan = chapterScanReader()->scan(chapterScanFixture(), SCAN_UNIT, SCAN_STOP, SCAN_CHAPTER, SCAN_BOOK);

    expect($scan->chapters[0]->title)->toBe('FIXTURE chapter title 1')
        ->and(array_map(static fn ($unit): ?int => $unit->number, $scan->chapters[0]->units))->toBe([1, 2]);
});

it('a book heading ends the chapter and its units are in no chapter', function (): void {
    $scan = chapterScanReader()->scan(chapterScanFixture(), SCAN_UNIT, SCAN_STOP, SCAN_CHAPTER, SCAN_BOOK);

    $numbers = [];

    foreach ($scan->chapters as $chapter) {
        foreach ($chapter->units as $unit) {
            $numbers[] = $unit->number;
        }
    }

    expect($numbers)->toBe([1, 2, 3, 4])
        ->and($scan->chapters[0]->units)->toHaveCount(2);
});

it('a numbered marker is a hadith unit, never a chapter', function (): void {
    $scan = chapterScanReader()->scan(chapterScanFixture(), SCAN_UNIT, SCAN_STOP, SCAN_CHAPTER, SCAN_BOOK);

    expect(array_column(array_map(static fn ($chapter): array => ['title' => $chapter->title], $scan->chapters), 'title'))
        ->not->toContain('1 - FIXTURE text 1 — not a hadith');
});

it('headings with no numbered unit are not chapters and are counted', function (): void {
    $scan = chapterScanReader()->scan(chapterScanFixture(), SCAN_UNIT, SCAN_STOP, SCAN_CHAPTER, SCAN_BOOK);

    expect($scan->headingsWithoutUnits)->toBe(1)
        ->and(array_map(static fn ($chapter): string => $chapter->title, $scan->chapters))->toBe(['FIXTURE chapter title 1', 'FIXTURE chapter title 3', 'FIXTURE chapter title 4 FIXTURE continuation']);
});

it('joins continuation lines into the title and reports them', function (): void {
    $scan = chapterScanReader()->scan(chapterScanFixture(), SCAN_UNIT, SCAN_STOP, SCAN_CHAPTER, SCAN_BOOK);
    $chapter = $scan->chapters[2];

    expect($chapter->title)->toBe('FIXTURE chapter title 4 FIXTURE continuation')
        ->and($chapter->hadContinuation)->toBeTrue();
});

it('counts the line shapes of the census', function (): void {
    $scan = chapterScanReader()->scan(chapterScanFixture(), SCAN_UNIT, SCAN_STOP, SCAN_CHAPTER, SCAN_BOOK);

    expect($scan->census['unit_marker'])->toBe(4)
        ->and($scan->census['continuation'])->toBe(1)
        ->and($scan->census['page_marker'])->toBe(1)
        ->and($scan->census['heading'])->toBe(6);
});
