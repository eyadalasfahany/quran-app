<?php

declare(strict_types=1);

require_once __DIR__.'/../Support/HadithImportFixtures.php';

use App\Domains\Hadith\Import\Records\MappingResult;
use App\Domains\Hadith\Services\HadithImportFingerprint;
use App\Domains\Hadith\Sources\Records\SourceHadith;
use App\Domains\Hadith\Sources\Records\SourceSection;

/*
| Out-of-range placements, reference exceptions and the Ibn Majah range corrections (ADR 0076 decisions 6 and 9, step 6b.2).
| Placeholder text only.
*/

/**
 * Every number of the default sections has text and a matching reference book, so only the tested number is in question.
 *
 * @return list<SourceHadith>
 */
function hadithPlacementFixtureHadith(): array
{
    return [
        hadithImportHadith('1', 'FIXTURE text 1 — not a hadith', '1'),
        hadithImportHadith('2', 'FIXTURE text 2 — not a hadith', '1'),
        hadithImportHadith('3', 'FIXTURE text 3 — not a hadith', '2'),
        hadithImportHadith('4', 'FIXTURE text 4 — not a hadith', '2'),
        hadithImportHadith('2787.2', 'FIXTURE text 5 — not a hadith', '3'),
    ];
}

/**
 * The book id the mapper gave to a section key, from the plan's books.
 */
function hadithPlacementBookId(MappingResult $mapping, string $bookNumber): int
{
    foreach ($mapping->plan->books as $book) {
        if ((string) $book['book_number'] === $bookNumber) {
            return (int) $book['id'];
        }
    }

    throw new RuntimeException('FIXTURE book not found.');
}

/**
 * The book id of the entry with the given hadith number, from the plan's entries.
 */
function hadithPlacementEntryBookId(MappingResult $mapping, string $number): int
{
    foreach ($mapping->plan->entries as $entry) {
        if ((string) $entry['hadith_number'] === $number) {
            return (int) $entry['book_id'];
        }
    }

    throw new RuntimeException('FIXTURE entry not found.');
}

it('places a hadith that is outside every range into the named book', function (): void {
    config(['hadith.placements' => ['bukhari' => ['500' => '2']]]);

    $hadiths = hadithPlacementFixtureHadith();
    $hadiths[] = hadithImportHadith('500', 'FIXTURE text 500 — not a hadith', '2');

    $mapping = hadithImportMap(hadithImportRecord($hadiths));

    expect(hadithPlacementEntryBookId($mapping, '500'))->toBe(hadithPlacementBookId($mapping, '2'))
        ->and($mapping->stats->placedNumbers)->toBe(['500'])
        ->and($mapping->stats->outsideRanges)->toBe([]);
});

it('exempts a placed hadith from the reference.book check', function (): void {
    // reference.book 1 disagrees with the placed section 2 on purpose: a placed hadith is not checked (ADR 0076, Q6).
    config(['hadith.placements' => ['bukhari' => ['500' => '2']]]);

    $hadiths = hadithPlacementFixtureHadith();
    $hadiths[] = hadithImportHadith('500', 'FIXTURE text 500 — not a hadith', '1');

    $mapping = hadithImportMap(hadithImportRecord($hadiths));

    expect($mapping->stats->referenceMismatchNumbers)->toBe([])
        ->and(hadithImportCodes($mapping->issues))->not->toContain('reference_book_mismatch');
});

it('errors on a placement naming an unknown section', function (): void {
    config(['hadith.placements' => ['bukhari' => ['500' => '99']]]);

    $hadiths = hadithPlacementFixtureHadith();
    $hadiths[] = hadithImportHadith('500', 'FIXTURE text 500 — not a hadith', '2');

    $mapping = hadithImportMap(hadithImportRecord($hadiths));

    expect(hadithImportCodes($mapping->issues))->toContain('placement_unknown_section')
        ->and($mapping->stats->complete)->toBeFalse();
});

it('errors on a placement for a number that has a range', function (): void {
    config(['hadith.placements' => ['bukhari' => ['2' => '3']]]);

    $mapping = hadithImportMap(hadithImportRecord(hadithPlacementFixtureHadith()));

    expect(hadithImportCodes($mapping->issues))->toContain('placement_in_range')
        ->and($mapping->stats->placedNumbers)->toBe([])
        ->and($mapping->stats->complete)->toBeFalse();
});

it('counts a placed number as resolved for completeness', function (): void {
    config(['hadith.placements' => ['bukhari' => ['500' => '2']]]);

    $hadiths = hadithPlacementFixtureHadith();
    $hadiths[] = hadithImportHadith('500', 'FIXTURE text 500 — not a hadith', '2');

    $stats = hadithImportMap(hadithImportRecord($hadiths))->stats;

    expect($stats->complete)->toBeTrue()
        ->and($stats->incompleteNumbers)->toBe([]);
});

it('bumps the version when a placement changes', function (): void {
    $fingerprints = app(HadithImportFingerprint::class);

    config(['hadith.placements' => ['bukhari' => ['500' => '2']]]);
    $before = $fingerprints->of('bukhari', 'FIXTURE attribution ar', 'FIXTURE attribution en');

    config(['hadith.placements' => ['bukhari' => ['500' => '3']]]);
    $after = $fingerprints->of('bukhari', 'FIXTURE attribution ar', 'FIXTURE attribution en');

    expect($after)->not->toBe($before);
});

it('applies the Ibn Majah range corrections so the boundary numbers go to one section each', function (): void {
    $sections = [
        new SourceSection('10', null, '1990', '2100', '1', '1'),
        new SourceSection('11', null, '2090', '2150', '2', '2'),
        new SourceSection('15', null, '2300', '2500', '3', '3'),
    ];
    $hadiths = [
        hadithImportHadith('2089', 'FIXTURE text 2089 — not a hadith', '10'),
        hadithImportHadith('2090', 'FIXTURE text 2090 — not a hadith', '11'),
    ];

    $mapping = hadithImportMap(hadithImportRecord($hadiths, $sections, 'ibnmajah'));

    expect(hadithImportCodes($mapping->issues))->not->toContain('ambiguous_range')
        ->and(hadithPlacementEntryBookId($mapping, '2089'))->toBe(hadithPlacementBookId($mapping, '10'))
        ->and(hadithPlacementEntryBookId($mapping, '2090'))->toBe(hadithPlacementBookId($mapping, '11'))
        ->and($mapping->stats->rangeCorrectionsApplied)->toBe(['10', '15']);
});

it('accepts exactly the configured Ibn Majah reference exceptions', function (): void {
    $sections = [
        new SourceSection('10', null, '2016', '2089', '1', '1'),
        new SourceSection('15', null, '2390', '2435', '2', '2'),
    ];
    $hadiths = [
        hadithImportHadith('2435', 'FIXTURE text 2435 — not a hadith', '10'),
        hadithImportHadith('2400', 'FIXTURE text 2400 — not a hadith', '10'),
    ];

    $mapping = hadithImportMap(hadithImportRecord($hadiths, $sections, 'ibnmajah'));

    expect($mapping->stats->referenceExceptionNumbers)->toBe(['2435'])
        ->and($mapping->stats->referenceMismatchNumbers)->toBe(['2400']);
});
