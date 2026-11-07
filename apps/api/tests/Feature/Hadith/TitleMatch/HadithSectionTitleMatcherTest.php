<?php

declare(strict_types=1);

use App\Domains\Hadith\Services\HadithSectionTitleMatcher;

/*
| The two-way 95% rule (ADR 0042 §4a, step 6). Pure: inputs are built by loops, nothing is fetched.
*/

/**
 * @return list<string>
 */
function hadithMatchNumbers(string $prefix, int $count): array
{
    $numbers = [];

    for ($i = 1; $i <= $count; $i++) {
        $numbers[] = $prefix.$i;
    }

    return $numbers;
}

/**
 * @param  list<string>  $numbers
 * @return list<array{number: string, chapter_number: string}>
 */
function hadithMatchPairs(array $numbers, string $chapterNumber): array
{
    return array_map(fn (string $number): array => ['number' => $number, 'chapter_number' => $chapterNumber], $numbers);
}

it('accepts a section at exactly 95% forward and 95% backward', function (): void {
    $section = hadithMatchNumbers('a', 1000);
    $inChapter = array_slice($section, 0, 950);
    $outside = hadithMatchNumbers('b', 50);
    $pairs = array_merge(hadithMatchPairs($inChapter, '1'), hadithMatchPairs($outside, '1'));
    // The section's remaining 50 numbers map to chapter 2, so chapter 1 holds 950 section numbers and 50 outside numbers.
    $pairs = array_merge($pairs, hadithMatchPairs(array_slice($section, 950), '2'));

    $match = app(HadithSectionTitleMatcher::class)->match(['1' => $section], $pairs, ['1' => 'FIXTURE chapter 1', '2' => 'FIXTURE chapter 2'])[0];

    expect($match->accepted)->toBeTrue()
        ->and($match->forwardMatched)->toBe(950)
        ->and($match->sectionSize)->toBe(1000)
        ->and($match->backwardMatched)->toBe(950)
        ->and($match->chapterSize)->toBe(1000);
});

it('rejects at 94.9% forward', function (): void {
    $section = hadithMatchNumbers('a', 1000);
    $pairs = array_merge(
        hadithMatchPairs(array_slice($section, 0, 949), '1'),
        hadithMatchPairs(array_slice($section, 949), '2'),
    );

    $match = app(HadithSectionTitleMatcher::class)->match(['1' => $section], $pairs, ['1' => 'FIXTURE chapter 1', '2' => 'FIXTURE chapter 2'])[0];

    expect($match->accepted)->toBeFalse()
        ->and($match->reason)->toBe('forward_below_threshold');
});

it('rejects at 94.9% backward', function (): void {
    $section = hadithMatchNumbers('a', 1000);
    $outside = hadithMatchNumbers('b', 53);
    $pairs = array_merge(
        hadithMatchPairs($section, '1'),
        hadithMatchPairs($outside, '1'),
    );
    // Chapter 1 holds 1,053 numbers; 1,000 of them are in the section: 1000/1053 is below 95%.
    $match = app(HadithSectionTitleMatcher::class)->match(['1' => $section], $pairs, ['1' => 'FIXTURE chapter 1'])[0];

    expect($match->accepted)->toBeFalse()
        ->and($match->reason)->toBe('backward_below_threshold');
});

it('rejects a match that passes forward but fails backward', function (): void {
    $section = hadithMatchNumbers('a', 1000);
    $outside = hadithMatchNumbers('b', 9000);
    $pairs = array_merge(hadithMatchPairs($section, '1'), hadithMatchPairs($outside, '1'));

    $match = app(HadithSectionTitleMatcher::class)->match(['1' => $section], $pairs, ['1' => 'FIXTURE chapter 1'])[0];

    expect($match->reason)->toBe('backward_below_threshold')
        ->and($match->forwardMatched)->toBe(1000);
});

it('rejects a section spread over two chapters', function (): void {
    $section = hadithMatchNumbers('a', 100);
    $pairs = array_merge(
        hadithMatchPairs(array_slice($section, 0, 60), '1'),
        hadithMatchPairs(array_slice($section, 60), '2'),
    );

    $match = app(HadithSectionTitleMatcher::class)->match(['1' => $section], $pairs, ['1' => 'FIXTURE chapter 1', '2' => 'FIXTURE chapter 2'])[0];

    expect($match->reason)->toBe('forward_below_threshold');
});

it('leaves numbers with no text out of the forward count', function (): void {
    $section = hadithMatchNumbers('a', 10);
    $noText = hadithMatchNumbers('z', 5);
    $pairs = hadithMatchPairs(array_merge($section, $noText), '1');

    $match = app(HadithSectionTitleMatcher::class)->match(['1' => $section], $pairs, ['1' => 'FIXTURE chapter 1'])[0];

    expect($match->sectionSize)->toBe(10)
        ->and($match->forwardMatched)->toBe(10)
        ->and($match->chapterSize)->toBe(15);
});

it('aligns numbers by exact string', function (): void {
    $matcher = app(HadithSectionTitleMatcher::class);

    $exact = $matcher->match(['1' => ['2787.2']], [['number' => '2787.2', 'chapter_number' => '1']], ['1' => 'FIXTURE chapter 1'])[0];
    $loose = $matcher->match(['1' => ['2787.2']], [['number' => '2787.20', 'chapter_number' => '1']], ['1' => 'FIXTURE chapter 1'])[0];
    $padded = $matcher->match(['1' => ['1']], [['number' => '01', 'chapter_number' => '1']], ['1' => 'FIXTURE chapter 1'])[0];

    expect($exact->forwardMatched)->toBe(1)
        ->and($loose->forwardMatched)->toBe(0)
        ->and($loose->reason)->toBe('no_chapter_mapped')
        ->and($padded->forwardMatched)->toBe(0);
});

it('never counts an ambiguous number as matched, and it lowers both percentages', function (): void {
    $section = ['1', '2'];
    $pairs = [
        ['number' => '1', 'chapter_number' => '1'],
        ['number' => '2', 'chapter_number' => '1'],
        ['number' => '2', 'chapter_number' => '2'],
    ];

    $match = app(HadithSectionTitleMatcher::class)->match(['1' => $section], $pairs, ['1' => 'FIXTURE chapter 1', '2' => 'FIXTURE chapter 2'])[0];

    expect($match->forwardMatched)->toBe(1)
        ->and($match->accepted)->toBeFalse()
        ->and($match->reason)->toBe('forward_below_threshold');
});

it('rejects an accepted-by-numbers match whose chapter has no title', function (): void {
    $match = app(HadithSectionTitleMatcher::class)->match(['1' => ['1']], [['number' => '1', 'chapter_number' => '1']], ['1' => ''])[0];

    expect($match->reason)->toBe('chapter_has_no_title')
        ->and($match->titleAr)->toBeNull();
});

it('rejects an empty section', function (): void {
    $match = app(HadithSectionTitleMatcher::class)->match(['1' => []], [], [])[0];

    expect($match->reason)->toBe('empty_section');
});

it('rejects when no number maps', function (): void {
    $match = app(HadithSectionTitleMatcher::class)->match(['1' => ['1']], [], ['1' => 'FIXTURE chapter 1'])[0];

    expect($match->reason)->toBe('no_chapter_mapped');
});

it('returns the title byte for byte', function (): void {
    $title = "FIXTURE chapter title\u{200F} ";
    $match = app(HadithSectionTitleMatcher::class)->match(['1' => ['1']], [['number' => '1', 'chapter_number' => '1']], ['1' => $title])[0];

    expect($match->accepted)->toBeTrue()
        ->and($match->titleAr === $title)->toBeTrue();
});

it('uses the configured threshold', function (): void {
    $section = hadithMatchNumbers('a', 1000);
    $pairs = array_merge(
        hadithMatchPairs(array_slice($section, 0, 999), '1'),
        hadithMatchPairs(array_slice($section, 999), '2'),
    );
    $chapters = ['1' => 'FIXTURE chapter 1', '2' => 'FIXTURE chapter 2'];

    $strict = app(HadithSectionTitleMatcher::class)->match(['1' => $section], $pairs, $chapters, 100)[0];
    $default = app(HadithSectionTitleMatcher::class)->match(['1' => $section], $pairs, $chapters)[0];

    expect($strict->accepted)->toBeFalse()
        ->and($strict->reason)->toBe('forward_below_threshold')
        ->and($default->accepted)->toBeTrue();
});

it('counts a number whose chapterNumber matches no chapter as unmapped, not as matched', function (): void {
    $section = ['1', '2'];
    $pairs = [
        ['number' => '1', 'chapter_number' => '99'],
        ['number' => '2', 'chapter_number' => '1'],
    ];

    $match = app(HadithSectionTitleMatcher::class)->match(['1' => $section], $pairs, ['1' => 'FIXTURE chapter 1'])[0];

    expect($match->accepted)->toBeFalse()
        ->and($match->reason)->toBe('forward_below_threshold')
        ->and($match->forwardMatched)->toBe(1)
        ->and($match->unmappedNumbers)->toBe(1);

    $onlyUnmapped = app(HadithSectionTitleMatcher::class)->match(['1' => ['1']], [['number' => '1', 'chapter_number' => '99']], ['1' => 'FIXTURE chapter 1'])[0];

    expect($onlyUnmapped->reason)->toBe('no_chapter_mapped')
        ->and($onlyUnmapped->unmappedNumbers)->toBe(1)
        ->and($onlyUnmapped->chapterNumber)->toBeNull();
});
