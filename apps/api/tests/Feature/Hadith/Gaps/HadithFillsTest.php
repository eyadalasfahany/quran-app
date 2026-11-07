<?php

declare(strict_types=1);

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Resource;
use App\Domains\Hadith\Exceptions\HadithDataFileException;
use App\Domains\Hadith\Import\Records\CollectionImportResult;
use App\Domains\Hadith\Models\HadithEntry;
use App\Domains\Hadith\Overlay\GapBook;
use App\Domains\Hadith\Overlay\GapFill;
use App\Domains\Hadith\Overlay\HadithDataFiles;
use App\Domains\Hadith\Overlay\HadithOverlay;
use App\Domains\Hadith\Overlay\HadithOverlayBuilder;
use App\Domains\Hadith\Services\HadithExtraBooks;
use App\Domains\Hadith\Services\HadithImporter;
use App\Domains\Hadith\Services\HadithRangeCorrections;
use App\Domains\Hadith\Sources\Records\SourceCollection;
use App\Domains\Hadith\Sources\Records\SourceHadith;
use App\Domains\Hadith\Sources\Records\SourceSection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

require_once __DIR__.'/../Support/HadithFixtureFiles.php';
require_once __DIR__.'/../Support/HadithImportFixtures.php';

uses(RefreshDatabase::class);

/*
| Gap fills, refusals and extra books (ADR 0076 decisions 4 and 6, the gap decisions, Q1 to Q3; step 6b.4). Placeholder text
| only: every text is «FIXTURE text», never a hadith.
*/

beforeEach(function (): void {
    config(['hadith.range_corrections' => []]);
});

afterEach(function (): void {
    File::deleteDirectory(storage_path('framework/testing/hadith-gaps-'.getmypid()));
    File::deleteDirectory((string) config('content_sources.cache_root'));
});

/**
 * @return array<string, mixed>
 */
function hadithFillsEntry(string $number, string $origin = 'openiti', ?string $text = null, ?string $sha = null, ?string $key = null): array
{
    $text ??= 'FIXTURE text '.$number.' — not a hadith';

    return [
        'number' => $number,
        'origin' => $origin,
        'source_key' => $key ?? $origin.':bukhari:'.$number,
        'unit' => 1,
        'text_ar' => $text,
        'source_text_sha256' => $sha ?? hash('sha256', $text),
    ];
}

function hadithFillsBuilder(string $directory): HadithOverlayBuilder
{
    return new HadithOverlayBuilder(new HadithDataFiles($directory), app(HadithRangeCorrections::class), app(HadithExtraBooks::class));
}

/**
 * @param  list<SourceHadith>  $hadiths
 * @param  list<SourceSection>|null  $sections
 */
function hadithFillsSource(array $hadiths, ?array $sections = null): SourceCollection
{
    return hadithImportRecord($hadiths, $sections);
}

/**
 * The overlay the builder would return for these fills, built by hand (the mapper tests need no file).
 *
 * @param  list<GapFill>  $fills
 * @param  list<GapBook>  $books
 */
function hadithFillsOverlay(array $fills, array $books = [], string $origin = 'openiti', array $refused = []): HadithOverlay
{
    $byNumber = [];

    foreach ($fills as $fill) {
        $byNumber[$fill->number] = $fill;
    }

    return new HadithOverlay(
        merges: [],
        originSourceIds: ['openiti' => 7, 'hadithapicom' => 9],
        originVersions: ['openiti' => '2023.1.8', 'hadithapicom' => 'retrieved-2026-11-07'],
        fills: $byNumber,
        books: $books,
        refusedFills: $refused,
    );
}

function hadithFillsGapFill(string $number, string $origin = 'openiti', ?string $text = null): GapFill
{
    $text ??= 'FIXTURE text '.$number.' — not a hadith';

    return new GapFill(number: $number, origin: $origin, sourceKey: $origin.':bukhari:'.$number, unit: 1, text: $text, sourceTextSha256: hash('sha256', $text));
}

function hadithFillsResourceId(string $slug = 'bukhari'): int
{
    return (int) Resource::query()->where('group', ResourceGroup::HadithCollections->value)->where('source_key', $slug)->value('id');
}

it('fills a no-text number in place with the filled text, origin id and key', function (): void {
    $mapping = hadithImportMapWithOverlay(
        hadithFillsSource([hadithImportHadith('3', null, '2'), hadithImportHadith('4', 'FIXTURE text 4 — not a hadith', '2')]),
        hadithFillsOverlay([hadithFillsGapFill('3')]),
    );

    $filled = $mapping->plan->entries[0];

    expect($filled['hadith_number'])->toBe('3')
        ->and($filled['position'])->toBe(1)
        ->and($filled['source_id'])->toBe(7)
        ->and($filled['source_key'])->toBe('openiti:bukhari:3')
        ->and($filled['source_version'])->toBe('2023.1.8')
        ->and($filled['source_code'])->toBe('openiti')
        ->and($filled['text_ar'])->toBe('FIXTURE text 3 — not a hadith')
        ->and($filled['source_text_sha256'])->toBe(hash('sha256', 'FIXTURE text 3 — not a hadith'))
        ->and($mapping->plan->entries[1]['source_code'])->toBeNull()
        ->and($mapping->plan->entries[1]['source_id'])->toBe(1)
        ->and($mapping->stats->filledNumbers)->toBe(['3']);
});

it('uses the hadithapicom row for a hadithapicom fill', function (): void {
    $mapping = hadithImportMapWithOverlay(
        hadithFillsSource([hadithImportHadith('3', null, '2')]),
        hadithFillsOverlay([hadithFillsGapFill('3', 'hadithapicom')]),
    );

    expect($mapping->plan->entries[0]['source_id'])->toBe(9)
        ->and($mapping->plan->entries[0]['source_code'])->toBe('hadithapicom')
        ->and($mapping->plan->entries[0]['source_version'])->toBe('retrieved-2026-11-07')
        ->and($mapping->plan->entries[0]['source_key'])->toBe('hadithapicom:bukhari:3');
});

it('resolves a collection to complete when fills close every gap', function (): void {
    $mapping = hadithImportMapWithOverlay(
        hadithFillsSource([hadithImportHadith('3', null, '2'), hadithImportHadith('4', 'FIXTURE text 4 — not a hadith', '2')]),
        hadithFillsOverlay([hadithFillsGapFill('3')]),
    );

    expect($mapping->stats->complete)->toBeTrue()
        ->and($mapping->stats->incompleteNumbers)->toBe([])
        ->and($mapping->stats->imported)->toBe(2);
});

it('turns an unresolved number into a placeholder row and no longer holds the collection back (rule amended 7 Nov 2026)', function (): void {
    $directory = hadithGapsFixtureFile('bukhari', unresolved: [['number' => '3', 'reason' => 'unknown_after_measurement']]);
    $overlay = hadithFillsBuilder($directory)->build('bukhari', hadithFillsSource([hadithImportHadith('3', null, '2'), hadithImportHadith('4', 'FIXTURE text 4 — not a hadith', '2')]), ['openiti' => 7, 'hadithapicom' => 9]);

    $mapping = hadithImportMapWithOverlay(hadithFillsSource([hadithImportHadith('3', null, '2'), hadithImportHadith('4', 'FIXTURE text 4 — not a hadith', '2')]), $overlay);
    $placeholder = $mapping->plan->entries[0];

    expect($overlay->fills)->toBe([])
        ->and($overlay->unavailable)->toBe(['3'])
        ->and($mapping->stats->complete)->toBeTrue()
        ->and($mapping->stats->unavailableNumbers)->toBe(['3'])
        ->and($placeholder['hadith_number'])->toBe('3')
        ->and($placeholder['text_ar'])->toBe('')
        ->and($placeholder['text_search'])->toBe('')
        ->and($placeholder['source_code'])->toBe('unavailable')
        ->and($placeholder['source_key'])->toBe('unavailable:bukhari:3')
        ->and($placeholder['source_text_sha256'])->toBe(hash('sha256', ''));
});

it('refuses a fill whose text carries markup and leaves the gap unknown', function (): void {
    $directory = hadithGapsFixtureFile('bukhari', fills: [hadithFillsEntry('3', text: 'FIXTURE <b>text</b> 3')]);
    $source = hadithFillsSource([hadithImportHadith('3', null, '2'), hadithImportHadith('4', 'FIXTURE text 4 — not a hadith', '2')]);
    $overlay = hadithFillsBuilder($directory)->build('bukhari', $source, ['openiti' => 7, 'hadithapicom' => 9]);

    $mapping = hadithImportMapWithOverlay($source, $overlay);

    expect($overlay->fills)->toBe([])
        ->and($overlay->refusedFills)->toBe(['3'])
        ->and(hadithImportCodes($mapping->issues))->toContain('fill_refused_markup')
        ->and($mapping->stats->complete)->toBeFalse()
        ->and($mapping->stats->incompleteReasons['3'])->toBe('no_text');
});

it('refuses a fill whose target has text', function (): void {
    $directory = hadithGapsFixtureFile('bukhari', fills: [hadithFillsEntry('4')]);
    $source = hadithFillsSource([hadithImportHadith('4', 'FIXTURE text 4 — not a hadith', '2')]);

    expect(fn () => hadithFillsBuilder($directory)->build('bukhari', $source, ['openiti' => 7, 'hadithapicom' => 9]))
        ->toThrow(HadithDataFileException::class, 'fill_target_has_text');
});

it('refuses a fill for a number the edition does not have', function (): void {
    $directory = hadithGapsFixtureFile('bukhari', fills: [hadithFillsEntry('9999')]);
    $source = hadithFillsSource([hadithImportHadith('4', 'FIXTURE text 4 — not a hadith', '2')]);

    expect(fn () => hadithFillsBuilder($directory)->build('bukhari', $source, ['openiti' => 7, 'hadithapicom' => 9]))
        ->toThrow(HadithDataFileException::class, 'fill_target_missing');
});

it('refuses a wrong text hash', function (): void {
    $directory = hadithGapsFixtureFile('bukhari', fills: [hadithFillsEntry('3', sha: str_repeat('a', 64))]);

    expect(fn () => hadithFillsBuilder($directory)->build('bukhari', hadithFillsSource([hadithImportHadith('3', null, '2')]), ['openiti' => 7, 'hadithapicom' => 9]))
        ->toThrow(HadithDataFileException::class, 'fill_hash_mismatch');
});

it('refuses a source_key that does not follow the rule', function (): void {
    $directory = hadithGapsFixtureFile('bukhari', fills: [hadithFillsEntry('3', key: 'openiti:bukhari:9')]);

    expect(fn () => hadithFillsBuilder($directory)->build('bukhari', hadithFillsSource([hadithImportHadith('3', null, '2')]), ['openiti' => 7, 'hadithapicom' => 9]))
        ->toThrow(HadithDataFileException::class, 'fill_key_invalid');
});

it('refuses a gaps file whose SHA-256 differs from the pin', function (): void {
    $directory = hadithGapsFixtureFile('bukhari', fills: [hadithFillsEntry('3')]);
    config(['hadith.data_files' => ['gaps/bukhari.json' => str_repeat('0', 64)]]);

    expect(fn () => hadithFillsBuilder($directory)->build('bukhari', hadithFillsSource([hadithImportHadith('3', null, '2')]), ['openiti' => 7, 'hadithapicom' => 9]))
        ->toThrow(HadithDataFileException::class, 'sha_mismatch');
});

it('inserts the extra book after after_book and shifts later positions', function (): void {
    $mapping = hadithImportMapWithOverlay(
        hadithFillsSource([
            hadithImportHadith('1', 'FIXTURE text 1 — not a hadith', '1'),
            hadithImportHadith('5', 'FIXTURE text 5 — not a hadith', '1.1'),
            hadithImportHadith('6', 'FIXTURE text 6 — not a hadith', '1.1'),
            hadithImportHadith('3', 'FIXTURE text 3 — not a hadith', '2'),
        ]),
        hadithFillsOverlay([], [new GapBook('1.1', '1', '5', '6', 'FIXTURE book title 1', 'openiti', 'openiti:bukhari:1.1')]),
    );

    $books = collect($mapping->plan->books)->keyBy('book_number');

    expect(array_column($mapping->plan->books, 'book_number'))->toBe(['1', '1.1', '2'])
        ->and(array_column($mapping->plan->books, 'position'))->toBe([1, 2, 3])
        ->and($books['2']['position'])->toBe(3)
        ->and($books['1.1']['title_ar'])->toBe('FIXTURE book title 1')
        ->and($books['1.1']['source_id'])->toBe(7)
        ->and($books['1.1']['source_key'])->toBe('openiti:bukhari:1.1');
});

it('puts the fills of the extra book inside it by range', function (): void {
    $mapping = hadithImportMapWithOverlay(
        hadithFillsSource([
            hadithImportHadith('5', null, '1.1'),
            hadithImportHadith('6', 'FIXTURE text 6 — not a hadith', '1.1'),
        ]),
        hadithFillsOverlay([hadithFillsGapFill('5')], [new GapBook('1.1', '1', '5', '6', 'FIXTURE book title 1', 'openiti', 'openiti:bukhari:1.1')]),
    );

    $bookId = collect($mapping->plan->books)->firstWhere('book_number', '1.1')['id'];

    expect($mapping->plan->entries[0]['hadith_number'])->toBe('5')
        ->and($mapping->plan->entries[0]['book_id'])->toBe($bookId)
        ->and($mapping->plan->entries[0]['source_code'])->toBe('openiti');
});

it('refuses an undecided book number', function (): void {
    $book = ['book_number' => null, 'after_book' => '1', 'first' => '5', 'last' => '6', 'title_ar' => 'FIXTURE book title 1', 'origin' => 'openiti', 'source_key' => 'openiti:bukhari:1.1'];
    config(['hadith.extra_books' => ['bukhari' => [['book_number' => null, 'after_book' => '1', 'first' => '5', 'last' => '6']]]]);
    $directory = hadithGapsFixtureFile('bukhari', books: [$book]);

    expect(fn () => hadithFillsBuilder($directory)->build('bukhari', hadithFillsSource([hadithImportHadith('5', 'FIXTURE text 5 — not a hadith', '1.1')]), ['openiti' => 7, 'hadithapicom' => 9]))
        ->toThrow(HadithDataFileException::class, 'book_number_undecided');
});

it('refuses a book whose range overlaps another section', function (): void {
    $book = ['book_number' => '2.1', 'after_book' => '1', 'first' => '2', 'last' => '3', 'title_ar' => 'FIXTURE book title 1', 'origin' => 'openiti', 'source_key' => 'openiti:bukhari:2.1'];
    config(['hadith.extra_books' => ['bukhari' => [['book_number' => '2.1', 'after_book' => '1', 'first' => '2', 'last' => '3']]]]);
    $directory = hadithGapsFixtureFile('bukhari', books: [$book]);

    expect(fn () => hadithFillsBuilder($directory)->build('bukhari', hadithFillsSource([hadithImportHadith('5', 'FIXTURE text 5 — not a hadith', '1')], hadithImportSections()), ['openiti' => 7, 'hadithapicom' => 9]))
        ->toThrow(HadithDataFileException::class, 'book_range_overlaps');
});

it('refuses a gaps file whose books differ from config', function (): void {
    $book = ['book_number' => '1.1', 'after_book' => '1', 'first' => '5', 'last' => '6', 'title_ar' => 'FIXTURE book title 1', 'origin' => 'openiti', 'source_key' => 'openiti:bukhari:1.1'];
    $directory = hadithGapsFixtureFile('bukhari', books: [$book]);

    expect(fn () => hadithFillsBuilder($directory)->build('bukhari', hadithFillsSource([hadithImportHadith('5', null, '1.1')]), ['openiti' => 7, 'hadithapicom' => 9]))
        ->toThrow(HadithDataFileException::class, 'book_mismatch_with_config');
});

it('ships the Nasa\'i extra book with the decided book number 35.1', function (): void {
    expect(config('hadith.extra_books.nasai.0.book_number'))->toBe('35.1')
        ->and(config('hadith.extra_books.nasai.0.after_book'))->toBe('35')
        ->and(app(HadithExtraBooks::class)->forSlug('nasai')[0]['book_number'])->toBe('35.1');
});

it('keeps the notice file for the gap fills in place', function (): void {
    expect(File::exists(database_path('data/hadith/gaps/LICENSE-NOTICE.md')))->toBeTrue();
});

/*
| The importer and the database.
*/

describe('through the importer', function (): void {
    beforeEach(function (): void {
        Http::preventStrayRequests();
        Storage::fake('local');
        hadithImportUse(hadithImportFiles());
        hadithImportWarm();
    });

    it('stores the filled row with its origin id, key, version and code', function (): void {
        hadithGapsFixtureFile('bukhari', fills: [hadithFillsEntry('3')]);

        $report = hadithImportRun(['bukhari'], false, false, true);
        $resourceId = hadithFillsResourceId();
        $openiti = ContentSource::query()->where('code', 'openiti')->value('id');
        $row = HadithEntry::query()->where('resource_id', $resourceId)->where('hadith_number', '3')->first();

        expect($report->collections[0]->status)->toBe(CollectionImportResult::STATUS_IMPORTED)
            ->and($row?->source_id)->toBe($openiti)
            ->and($row?->source_key)->toBe('openiti:bukhari:3')
            ->and($row?->source_version)->toBe('2023.1.8')
            ->and($row?->source_code)->toBe('openiti')
            ->and($row?->text_ar)->toBe('FIXTURE text 3 — not a hadith')
            ->and(HadithEntry::query()->where('resource_id', $resourceId)->where('hadith_number', '4')->value('source_code'))->toBeNull();
    });

    it('verify reports no extra rows for filled rows and the integrity check passes', function (): void {
        hadithGapsFixtureFile('bukhari', fills: [hadithFillsEntry('3')]);
        hadithImportRun(['bukhari'], false, false, true);

        $verified = app(HadithImporter::class)->verify(['bukhari'])->collections[0];

        expect($verified->status)->toBe(CollectionImportResult::STATUS_VERIFIED);
    });

    it('round trips the fill bytes through the database and the built pack', function (): void {
        $text = "FIXTURE text 3\u{200F} — \u{064E}  not a hadith";
        hadithGapsFixtureFile('bukhari', fills: [hadithFillsEntry('3', text: $text)]);
        hadithImportRun(['bukhari'], false, false, true);
        $resourceId = hadithFillsResourceId();

        $stored = HadithEntry::query()->where('resource_id', $resourceId)->where('hadith_number', '3')->value('text_ar');
        $packed = collect(hadithImportPack($resourceId)['tables']['hadith_entries'])->keyBy('hadith_number');

        expect($stored)->toBe($text)
            ->and($packed['3']['text_ar'])->toBe($text)
            ->and($packed['3']['source_code'])->toBe('openiti')
            ->and($packed['4']['source_code'])->toBeNull();
    });

    it('changing the gaps file bumps the version, and an identical re-import does not', function (): void {
        hadithGapsFixtureFile('bukhari', fills: [hadithFillsEntry('3')]);
        $first = hadithImportRun(['bukhari'], false, false, true)->collections[0];

        hadithGapsFixtureFile('bukhari', fills: [hadithFillsEntry('3')]);
        $same = hadithImportRun(['bukhari'], false, false, true)->collections[0];

        hadithGapsFixtureFile('bukhari', fills: [hadithFillsEntry('3', text: 'FIXTURE text 3 changed')]);
        $changed = hadithImportRun(['bukhari'], false, false, true)->collections[0];

        expect($first->status)->toBe(CollectionImportResult::STATUS_IMPORTED)
            ->and($same->status)->toBe(CollectionImportResult::STATUS_UNCHANGED)
            ->and($changed->versionAfter)->toBeGreaterThan($changed->versionBefore);
    });
});
