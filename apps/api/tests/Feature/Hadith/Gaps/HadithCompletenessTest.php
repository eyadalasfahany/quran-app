<?php

declare(strict_types=1);
use App\Domains\Hadith\Sources\Records\SourceHadith;

require_once __DIR__.'/../Support/HadithImportFixtures.php';

/*
| Completeness per collection (ADR 0076 «Rule, 7 Nov 2026», step 6b.1). Placeholder text only.
*/

/**
 * Every number of the default fixture has text and sits in a section range.
 *
 * @return list<SourceHadith>
 */
function hadithCompleteFixtureHadith(): array
{
    return [
        hadithImportHadith('1', 'FIXTURE text 1 — not a hadith', '1'),
        hadithImportHadith('2', 'FIXTURE text 2 — not a hadith', '1'),
        hadithImportHadith('3', 'FIXTURE text 3 — not a hadith', '2'),
        hadithImportHadith('4', 'FIXTURE text 4 — not a hadith', '2'),
        hadithImportHadith('2787.2', 'FIXTURE text 5 — not a hadith', '3'),
    ];
}

it('is complete when every number has text', function (): void {
    $mapping = hadithImportMap(hadithImportRecord(hadithCompleteFixtureHadith()));

    expect($mapping->stats->complete)->toBeTrue()
        ->and($mapping->stats->incompleteNumbers)->toBe([])
        ->and($mapping->plan->collection['is_complete'])->toBe(1)
        ->and($mapping->plan->collection['incomplete_count'])->toBe(0);
});

it('lists a no-text number as incomplete with reason no_text', function (): void {
    $hadiths = hadithCompleteFixtureHadith();
    $hadiths[2] = hadithImportHadith('3', null, '2');

    $mapping = hadithImportMap(hadithImportRecord($hadiths));

    expect($mapping->stats->complete)->toBeFalse()
        ->and($mapping->stats->incompleteNumbers)->toBe(['3'])
        ->and($mapping->stats->incompleteReasons)->toBe(['3' => 'no_text'])
        ->and($mapping->plan->collection['is_complete'])->toBe(0)
        ->and($mapping->plan->collection['incomplete_count'])->toBe(1);
});

it('lists an outside-range number as incomplete with reason outside_range', function (): void {
    $hadiths = hadithCompleteFixtureHadith();
    $hadiths[] = hadithImportHadith('500', 'FIXTURE text 500 — not a hadith', '1');

    $mapping = hadithImportMap(hadithImportRecord($hadiths));

    expect($mapping->stats->complete)->toBeFalse()
        ->and($mapping->stats->outsideRanges)->toBe(['500'])
        ->and($mapping->stats->incompleteNumbers)->toBe(['500'])
        ->and($mapping->stats->incompleteReasons)->toBe(['500' => 'outside_range']);
});

it('accepts a completeness exception and reports it', function (): void {
    config(['hadith.completeness_exceptions' => ['bukhari' => ['3']]]);

    $hadiths = hadithCompleteFixtureHadith();
    $hadiths[2] = hadithImportHadith('3', null, '2');

    $mapping = hadithImportMap(hadithImportRecord($hadiths));

    expect($mapping->stats->complete)->toBeTrue()
        ->and($mapping->stats->incompleteNumbers)->toBe([])
        ->and($mapping->stats->completenessExceptionNumbers)->toBe(['3']);
});

it('does not accept a reference exception as a completeness exception', function (): void {
    config(['hadith.reference_exceptions' => ['bukhari' => ['3']]]);

    $hadiths = hadithCompleteFixtureHadith();
    $hadiths[2] = hadithImportHadith('3', null, '2');

    $mapping = hadithImportMap(hadithImportRecord($hadiths));

    expect($mapping->stats->complete)->toBeFalse()
        ->and($mapping->stats->incompleteNumbers)->toBe(['3'])
        ->and($mapping->stats->completenessExceptionNumbers)->toBe([]);
});

it('is incomplete when an error issue exists', function (): void {
    $hadiths = hadithCompleteFixtureHadith();
    $hadiths[] = hadithImportHadith('1', 'FIXTURE text 1 again — not a hadith', '1');

    $mapping = hadithImportMap(hadithImportRecord($hadiths));

    expect($mapping->stats->complete)->toBeFalse()
        ->and($mapping->stats->incompleteNumbers)->toBe([])
        ->and(hadithImportCodes($mapping->issues))->toContain('duplicate_hadith_number');
});

it('lists numbers and reason codes only, never text', function (): void {
    $hadiths = hadithCompleteFixtureHadith();
    $hadiths[2] = hadithImportHadith('3', null, '2');

    $stats = hadithImportMap(hadithImportRecord($hadiths))->stats;

    foreach ($stats->incompleteNumbers as $number) {
        expect($number)->toBeString()->not->toContain('FIXTURE');
    }

    foreach ($stats->incompleteReasons as $reason) {
        expect($reason)->toBeIn(['no_text', 'outside_range', 'merge_target_missing']);
    }
});
