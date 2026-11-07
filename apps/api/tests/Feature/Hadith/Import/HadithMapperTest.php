<?php

declare(strict_types=1);

use App\Domains\Hadith\Exceptions\HadithRangeCorrectionException;
use App\Domains\Hadith\Exceptions\HadithReferenceMismatchException;
use App\Domains\Hadith\Import\Records\HadithIssue;
use App\Domains\Hadith\Import\Records\SectionMatch;
use App\Domains\Hadith\Services\HadithRangeCorrections;
use App\Domains\Hadith\Sources\Records\SourceCollection;
use App\Domains\Hadith\Sources\Records\SourceCollectionInfo;
use App\Domains\Hadith\Sources\Records\SourceGrade;
use App\Domains\Hadith\Sources\Records\SourceSection;
use App\Domains\Hadith\Validation\HadithCollectionValidator;
use App\Support\HadithText\HadithSearchTextNormalizer;

require_once __DIR__.'/../Support/HadithImportFixtures.php';

/*
| Mapper and validator (step 6). No database, no HTTP. Every text is a placeholder.
*/

beforeEach(function (): void {
    Http::preventStrayRequests();
    config(['hadith.range_corrections' => []]);
});

/**
 * The default five-hadith collection, built by hand (hadith 3 has no text; 2787.2 is decimal).
 */
function hadithImportDefaultRecord(): SourceCollection
{
    return hadithImportRecord([
        hadithImportHadith('1', 'FIXTURE text 1 — not a hadith', '1', [new SourceGrade('FIXTURE grader', 'FIXTURE grade')]),
        hadithImportHadith('2', "نص تجريبي ١ —\u{200F} ليس حديثًا", '1', [
            new SourceGrade('FIXTURE grader', 'FIXTURE grade'),
            new SourceGrade('FIXTURE grader 2', 'FIXTURE grade 2'),
        ]),
        hadithImportHadith('3', '', '2'),
        hadithImportHadith('4', 'FIXTURE text 4 — not a hadith', '2'),
        hadithImportHadith('2787.2', 'FIXTURE text 5 — not a hadith', '3'),
    ]);
}

it('assigns each hadith to a book by section ranges, with ids and positions', function (): void {
    $mapping = hadithImportMap(hadithImportDefaultRecord());
    $books = $mapping->plan->books;

    expect(array_map(fn (array $book): string => (string) $book['book_number'], $books))->toBe(['1', '2', '3'])
        ->and(array_map(fn (array $book): int => (int) $book['hadith_count'], $books))->toBe([2, 1, 1])
        ->and(array_map(fn (array $book): int => (int) $book['position'], $books))->toBe([1, 2, 3])
        ->and($mapping->stats->emptySectionKeys)->toBe(['0'])
        ->and($mapping->stats->booksCreated)->toBe(3)
        ->and($mapping->stats->section0IsBook)->toBeFalse()
        ->and($mapping->stats->section0Hadith)->toBe(0)
        ->and(array_map(fn (array $entry): int => (int) $entry['book_id'], $mapping->plan->entries))->toBe([1, 1, 2, 3])
        ->and(array_map(fn (array $entry): int => (int) $entry['position'], $mapping->plan->entries))->toBe([1, 2, 1, 1]);
});

it('keeps a decimal hadith number as text and finds its range numerically', function (): void {
    $entry = collect(hadithImportMap(hadithImportDefaultRecord())->plan->entries)->firstWhere('hadith_number', '2787.2');

    expect($entry)->not->toBeNull()
        ->and($entry['hadith_number'])->toBe('2787.2')
        ->and($entry['book_id'])->toBe(3);
});

it('skips a hadith with no text and lists it, for null, empty and invisible-only text', function (): void {
    $mapping = hadithImportMap(hadithImportRecord([
        hadithImportHadith('1', 'FIXTURE text 1'),
        hadithImportHadith('2', null),
        hadithImportHadith('3', "\u{200F}  \u{200F}"),
    ]));

    expect($mapping->stats->noTextNumbers)->toBe(['2', '3'])
        ->and($mapping->stats->noText)->toBe(2)
        ->and($mapping->plan->entries)->toHaveCount(1)
        ->and($mapping->issues)->toBe([]);
});

it('imports section 0 only when hadith fall in it', function (): void {
    $mapping = hadithImportMap(hadithImportRecord([
        hadithImportHadith('0', 'FIXTURE text 0', '0'),
        hadithImportHadith('1', 'FIXTURE text 1'),
    ]));

    expect($mapping->stats->section0IsBook)->toBeTrue()
        ->and($mapping->stats->section0Hadith)->toBe(1)
        ->and(array_map(fn (array $book): string => (string) $book['book_number'], $mapping->plan->books))->toContain('0')
        ->and($mapping->plan->books[0]['title_ar'])->toBeNull();
});

it('creates no book for an empty section and lists its key', function (): void {
    $mapping = hadithImportMap(hadithImportRecord([hadithImportHadith('1', 'FIXTURE text 1')]));

    expect($mapping->stats->emptySectionKeys)->toContain('2', '3', '0')
        ->and($mapping->stats->booksCreated)->toBe(1)
        ->and($mapping->plan->books)->toHaveCount(1);
});

it('stores every grade as received, with its grader and an index in its key, and none for a collection without grades', function (): void {
    $mapping = hadithImportMap(hadithImportDefaultRecord());
    $keys = array_column($mapping->plan->grades, 'source_key');

    expect($keys)->toBe(['fawazahmed0:bukhari:1:1', 'fawazahmed0:bukhari:2:1', 'fawazahmed0:bukhari:2:2'])
        ->and($mapping->stats->grades)->toBe(3)
        ->and($mapping->stats->hadithWithGrades)->toBe(2)
        ->and($mapping->stats->graders)->toBe(['FIXTURE grader' => 2, 'FIXTURE grader 2' => 1])
        ->and($mapping->stats->gradesWithoutGrader)->toBe(0);

    $none = hadithImportMap(hadithImportRecord([hadithImportHadith('1', 'FIXTURE text 1')]));

    expect($none->plan->grades)->toBe([])
        ->and($none->stats->graders)->toBe([]);
});

it('keeps text_ar byte-identical, hashes the exact bytes and derives text_search only', function (): void {
    $text = "نص تجريبي ١ —\u{200F} ليس حديثًا";
    $mapping = hadithImportMap(hadithImportRecord([hadithImportHadith('2', $text)]));
    $entry = $mapping->plan->entries[0];

    expect($entry['text_ar'])->toBe($text)
        ->and(strlen((string) $entry['text_ar']))->toBe(strlen($text))
        ->and($entry['source_text_sha256'])->toBe(hash('sha256', $text))
        ->and($entry['text_search'])->toBe(app(HadithSearchTextNormalizer::class)->normalize($text))
        ->and($entry['chapter_id'])->toBeNull()
        ->and($mapping->plan->chapters)->toBe([]);
});

it('uses the canonical slug and the source code in every key', function (): void {
    $mapping = hadithImportMap(hadithImportRecord([hadithImportHadith('1', 'FIXTURE text 1')], null, 'nawawi40'));

    expect($mapping->plan->entries[0]['source_key'])->toBe('fawazahmed0:nawawi40:1')
        ->and($mapping->plan->books[0]['source_key'])->toBe('fawazahmed0:nawawi40:1')
        ->and($mapping->plan->collection['slug'])->toBe('nawawi40');
});

it('lists a hadith outside every range and skips it without failing the collection', function (): void {
    $mapping = hadithImportMap(hadithImportRecord([hadithImportHadith('500', 'FIXTURE text 500'), hadithImportHadith('1', 'FIXTURE text 1')]));

    expect($mapping->issues)->toBe([])
        ->and($mapping->stats->outsideRanges)->toBe(['500'])
        ->and(array_column($mapping->plan->entries, 'hadith_number'))->toBe(['1']);
});

it('treats reference.book 0 as missing, never as a mismatch', function (): void {
    $mapping = hadithImportMap(hadithImportRecord([hadithImportHadith('1', 'FIXTURE text 1', '0')]));

    expect($mapping->stats->referenceMissing)->toBe(1)
        ->and($mapping->stats->referenceChecked)->toBe(0)
        ->and($mapping->stats->referenceMismatchNumbers)->toBe([])
        ->and($mapping->plan->entries)->toHaveCount(1);

    app(HadithCollectionValidator::class)->assertReferencesAgree('bukhari', $mapping->stats);
});

it('applies a range correction and removes the overlap', function (): void {
    $sections = [
        new SourceSection('15', null, '3200', '3397', null, null),
        new SourceSection('16', null, '3388', '3500', null, null),
    ];
    $hadiths = [hadithImportHadith('3390', 'FIXTURE text 3390', '0')];

    $before = hadithImportMap(hadithImportRecord($hadiths, $sections, 'muslim'));

    expect(hadithImportCodes($before->issues))->toBe(['ambiguous_range']);

    config(['hadith.range_corrections' => ['muslim' => ['16' => ['first' => '3398', 'last' => '3567']]]]);

    $after = hadithImportMap(hadithImportRecord($hadiths, $sections, 'muslim'));

    expect($after->issues)->toBe([])
        ->and($after->stats->rangeCorrectionsApplied)->toBe(['16'])
        ->and($after->plan->books[0]['book_number'])->toBe('15')
        ->and($after->stats->emptySectionKeys)->toBe(['16']);
});

it('refuses a correction for an unknown collection', function (): void {
    config(['hadith.range_corrections' => ['nope' => ['1' => ['first' => '1', 'last' => '2']]]]);

    expect(fn () => app(HadithRangeCorrections::class)->assertKnown())
        ->toThrow(HadithRangeCorrectionException::class, 'unknown collection [nope]');
});

it('refuses a correction for a section the source does not have', function (): void {
    config(['hadith.range_corrections' => ['muslim' => ['99' => ['first' => '1', 'last' => '2']]]]);

    expect(fn () => hadithImportMap(hadithImportRecord([hadithImportHadith('1', 'FIXTURE text 1')], null, 'muslim')))
        ->toThrow(HadithRangeCorrectionException::class, 'section [99]');
});

it('refuses a malformed correction', function (): void {
    config(['hadith.range_corrections' => ['muslim' => ['1' => ['first' => 3398, 'last' => '3567']]]]);

    expect(fn () => app(HadithRangeCorrections::class)->forSlug('muslim'))
        ->toThrow(HadithRangeCorrectionException::class);
});

it('reports a number inside two ranges unless reference.book picks one', function (): void {
    $sections = [
        new SourceSection('1', null, '1', '2', null, null),
        new SourceSection('2', null, '2', '3', null, null),
    ];

    $ambiguous = hadithImportMap(hadithImportRecord([hadithImportHadith('2', 'FIXTURE text 2', '9')], $sections));
    $resolved = hadithImportMap(hadithImportRecord([hadithImportHadith('2', 'FIXTURE text 2', '2')], $sections));

    expect(hadithImportCodes($ambiguous->issues))->toBe(['ambiguous_range'])
        ->and($resolved->issues)->toBe([])
        ->and($resolved->plan->entries[0]['book_id'])->toBe(1);
});

it('reports a non-numeric number', function (): void {
    $mapping = hadithImportMap(hadithImportRecord([hadithImportHadith('FIXTURE-NUMBER', 'FIXTURE text 1')]));

    expect(hadithImportCodes($mapping->issues))->toBe(['non_numeric_hadith_number']);
});

it('reports invalid UTF-8 and skips the hadith', function (): void {
    $mapping = hadithImportMap(hadithImportRecord([hadithImportHadith('1', "\xC3\x28"), hadithImportHadith('2', 'FIXTURE text 2')]));

    expect(hadithImportCodes($mapping->issues))->toBe(['invalid_utf8'])
        ->and(array_column($mapping->plan->entries, 'hadith_number'))->toBe(['2']);
});

it('reports a duplicate number once and keeps the first', function (): void {
    $mapping = hadithImportMap(hadithImportRecord([
        hadithImportHadith('1', 'FIXTURE first'),
        hadithImportHadith('1', 'FIXTURE second'),
    ]));

    expect($mapping->stats->duplicateNumbers)->toBe(['1'])
        ->and(hadithImportCodes($mapping->issues))->toBe(['duplicate_hadith_number'])
        ->and($mapping->plan->entries)->toHaveCount(1)
        ->and($mapping->plan->entries[0]['text_ar'])->toBe('FIXTURE first');
});

it('records a reference.book mismatch, keeps the range assignment and fails the collection', function (): void {
    $mapping = hadithImportMap(hadithImportRecord([hadithImportHadith('4', 'FIXTURE text 4', '1')]));

    expect($mapping->stats->referenceMismatchNumbers)->toBe(['4'])
        ->and($mapping->plan->entries[0]['book_id'])->toBe(1);

    $validator = app(HadithCollectionValidator::class);

    try {
        $validator->assertReferencesAgree('bukhari', $mapping->stats);
        $this->fail('expected a reference mismatch');
    } catch (HadithReferenceMismatchException $exception) {
        expect($exception->slug)->toBe('bukhari')
            ->and($exception->count)->toBe(1)
            ->and($exception->hadithNumbers)->toBe(['4'])
            ->and($exception->getMessage())->toBe('Collection [bukhari]: 1 hadith are in a book that disagrees with reference.book. First numbers: 4.');
    }
});

it('accepts a listed reference exception and warns instead', function (): void {
    config(['hadith.reference_exceptions' => ['bukhari' => ['4']]]);

    $mapping = hadithImportMap(hadithImportRecord([hadithImportHadith('4', 'FIXTURE text 4', '1')]));
    $issues = app(HadithCollectionValidator::class)->validate('bukhari', $mapping);
    app(HadithCollectionValidator::class)->assertReferencesAgree('bukhari', $mapping->stats);

    expect($mapping->stats->referenceExceptionNumbers)->toBe(['4'])
        ->and($mapping->stats->referenceMismatchNumbers)->toBe([])
        ->and(collect($issues)->firstWhere('code', 'reference_exception_used')?->severity)->toBe(HadithIssue::SEVERITY_WARNING);
});

it('reports counts against info.json as warnings, not errors', function (): void {
    $info = new SourceCollectionInfo('bukhari', 'bukhari', null, '9999', 99, 9);
    $mapping = hadithImportMap(hadithImportDefaultRecord(), $info);
    $issues = app(HadithCollectionValidator::class)->validate('bukhari', $mapping);

    $codes = hadithImportCodes($issues);

    expect($codes)->toContain('hadith_count_differs_from_info', 'last_hadith_number_differs_from_info', 'section_count_differs_from_info')
        ->and(collect($issues)->where('severity', HadithIssue::SEVERITY_ERROR)->all())->toBe([]);
});

it('rejects over-long fields', function (): void {
    $longSection = [new SourceSection(str_repeat('9', 17), null, '1', '2', null, null)];
    $mapping = hadithImportMap(hadithImportRecord([hadithImportHadith('1', 'FIXTURE text 1', str_repeat('9', 17))], $longSection));
    $codes = hadithImportCodes(app(HadithCollectionValidator::class)->validate('bukhari', $mapping));

    expect($codes)->toContain('book_number_too_long');

    $long = hadithImportHadith('1', 'FIXTURE text 1', '1', [new SourceGrade('FIXTURE grader', str_repeat('g', 121))]);
    $grade = hadithImportMap(hadithImportRecord([$long]));

    expect(hadithImportCodes($grade->issues))->toContain('grade_too_long');

    $sourceKey = hadithImportMap(hadithImportRecord([hadithImportHadith('1', 'FIXTURE text 1')]), null, 'FIXTURE attribution ar', 'FIXTURE attribution en', str_repeat('s', 90));
    expect(hadithImportCodes(app(HadithCollectionValidator::class)->validate('bukhari', $sourceKey)))->toContain('source_key_too_long');
});

it('uses titles only from hadith_titles, and only an approved author', function (): void {
    config([
        'hadith_titles.sections' => ['bukhari' => ['1' => ['title_ar' => 'FIXTURE title', 'title_ar_source' => 'hadithapi.com']]],
    ]);

    $mapping = hadithImportMap(hadithImportDefaultRecord());

    expect($mapping->plan->books[0]['title_ar'])->toBe('FIXTURE title')
        ->and($mapping->plan->books[1]['title_ar'])->toBeNull()
        ->and($mapping->plan->collection['author_ar'])->toBe('الإمام محمد بن إسماعيل البخاري');

    config(['hadith_titles.collections.bukhari.author_ar_status' => 'pending']);

    expect(hadithImportMap(hadithImportDefaultRecord())->plan->collection['author_ar'])->toBeNull();
});

it('estimates raw bytes from text lengths', function (): void {
    $mapping = hadithImportMap(hadithImportDefaultRecord());
    $expected = 0;

    foreach ($mapping->plan->entries as $entry) {
        $expected += strlen((string) $entry['text_ar']) + strlen((string) $entry['text_search']) + 150;
    }

    expect($mapping->stats->estimatedRawBytes)->toBe($expected)->toBeGreaterThan(0);
});

it('refuses an empty attribution with a validation error', function (): void {
    $mapping = hadithImportMap(hadithImportDefaultRecord(), null, '', 'FIXTURE attribution en');

    expect(hadithImportCodes(app(HadithCollectionValidator::class)->validate('bukhari', $mapping)))->toContain('source_attribution_missing');
});

it('keeps the match rule type available for the title matcher', function (): void {
    expect(new SectionMatch('1', true, 'accepted', '1', 'FIXTURE', 1, 1, 1, 1))->toBeInstanceOf(SectionMatch::class);
});
