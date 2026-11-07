<?php

declare(strict_types=1);

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Models\Resource;
use App\Domains\Hadith\Exceptions\HadithDataFileException;
use App\Domains\Hadith\Import\Records\CollectionImportResult;
use App\Domains\Hadith\Models\HadithCollection;
use App\Domains\Hadith\Models\HadithEntry;
use App\Domains\Hadith\Overlay\HadithDataFiles;
use App\Domains\Hadith\Overlay\HadithOverlay;
use App\Domains\Hadith\Overlay\HadithOverlayBuilder;
use App\Domains\Hadith\Services\HadithExtraBooks;
use App\Domains\Hadith\Services\HadithRangeCorrections;
use App\Domains\Hadith\Sources\Records\SourceCollection;
use App\Domains\Hadith\Sources\Records\SourceHadith;
use App\Domains\Hadith\Sources\Records\SourceSection;
use App\Domains\Hadith\Validation\HadithCollectionValidator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

require_once __DIR__.'/../Support/HadithFixtureFiles.php';
require_once __DIR__.'/../Support/HadithImportFixtures.php';

uses(RefreshDatabase::class);

/*
| Merges (ADR 0076 decision 2, step 6b.3). A merged number has no row; its covering row carries number_first and number_last.
| Placeholder text only: every text is «FIXTURE text», never a hadith.
*/

beforeEach(function (): void {
    config(['hadith.range_corrections' => []]);
});

afterEach(function (): void {
    File::deleteDirectory(storage_path('framework/testing/hadith-gaps-'.getmypid()));
    File::deleteDirectory((string) config('content_sources.cache_root'));
});

function hadithMergesText(string $number): SourceHadith
{
    return hadithImportHadith($number, 'FIXTURE text '.$number.' — not a hadith');
}

function hadithMergesNoText(string $number): SourceHadith
{
    return hadithImportHadith($number, null);
}

/**
 * @param  list<SourceHadith>  $hadiths
 * @param  list<SourceSection>  $sections
 */
function hadithMergesRecord(array $hadiths, array $sections): SourceCollection
{
    return hadithImportRecord($hadiths, $sections);
}

function hadithMergesSection(string $key, string $first, string $last): SourceSection
{
    return new SourceSection($key, null, $first, $last, null, null);
}

/**
 * @param  array<string, string>  $merges  merged number => covering number
 */
function hadithMergesOverlay(array $merges): HadithOverlay
{
    return new HadithOverlay(merges: $merges, originSourceIds: ['openiti' => 1], originVersions: ['openiti' => '2023.1.8']);
}

/**
 * @return list<array{number: string, into: string, origin: string}>
 */
function hadithMergesList(string ...$pairs): array
{
    $list = [];

    for ($index = 0; $index < count($pairs); $index += 2) {
        $list[] = ['number' => $pairs[$index], 'into' => $pairs[$index + 1], 'origin' => 'openiti'];
    }

    return $list;
}

/**
 * @param  list<array<string, mixed>>  $merges
 */
function hadithMergesBuild(SourceCollection $source, array $merges): ?HadithOverlay
{
    $directory = hadithGapsFixtureFile('bukhari', [], $merges);

    return (new HadithOverlayBuilder(new HadithDataFiles($directory), app(HadithRangeCorrections::class), app(HadithExtraBooks::class)))->build('bukhari', $source, ['openiti' => 1, 'hadithapicom' => 2]);
}

it('gives the covering row a span that includes its own number', function (): void {
    $mapping = hadithImportMapWithOverlay(
        hadithMergesRecord(
            [hadithMergesText('5709'), hadithMergesNoText('5710'), hadithMergesNoText('5711'), hadithMergesNoText('5712')],
            [hadithMergesSection('1', '5709', '5712')],
        ),
        hadithMergesOverlay(['5710' => '5709', '5711' => '5709', '5712' => '5709']),
    );

    expect($mapping->plan->entries)->toHaveCount(1)
        ->and($mapping->plan->entries[0]['hadith_number'])->toBe('5709')
        ->and($mapping->plan->entries[0]['number_first'])->toBe('5709')
        ->and($mapping->plan->entries[0]['number_last'])->toBe('5712');
});

it('gives a merge into the next row a span that ends at the row number', function (): void {
    $mapping = hadithImportMapWithOverlay(
        hadithMergesRecord([hadithMergesNoText('5708'), hadithMergesText('5709')], [hadithMergesSection('1', '5708', '5709')]),
        hadithMergesOverlay(['5708' => '5709']),
    );

    expect($mapping->plan->entries[0]['number_first'])->toBe('5708')
        ->and($mapping->plan->entries[0]['number_last'])->toBe('5709');
});

it('handles a row covering merges on both sides', function (): void {
    $mapping = hadithImportMapWithOverlay(
        hadithMergesRecord(
            [hadithMergesNoText('5708'), hadithMergesText('5709'), hadithMergesNoText('5710')],
            [hadithMergesSection('1', '5708', '5710')],
        ),
        hadithMergesOverlay(['5708' => '5709', '5710' => '5709']),
    );

    expect($mapping->plan->entries)->toHaveCount(1)
        ->and($mapping->plan->entries[0]['number_first'])->toBe('5708')
        ->and($mapping->plan->entries[0]['number_last'])->toBe('5710');
});

it('compares decimal numbers as decimals', function (): void {
    // As strings '9' is greater than '10'; as decimals 9 is the lowest and 10 the highest.
    $mapping = hadithImportMapWithOverlay(
        hadithMergesRecord(
            [hadithMergesNoText('9'), hadithMergesNoText('9.2'), hadithMergesText('10')],
            [hadithMergesSection('1', '9', '10')],
        ),
        hadithMergesOverlay(['9' => '10', '9.2' => '10']),
    );

    expect($mapping->plan->entries[0]['number_first'])->toBe('9')
        ->and($mapping->plan->entries[0]['number_last'])->toBe('10');
});

it('does not duplicate text: a merged number has no row', function (): void {
    $mapping = hadithImportMapWithOverlay(
        hadithMergesRecord([hadithMergesText('5709'), hadithMergesNoText('5710')], [hadithMergesSection('1', '5709', '5710')]),
        hadithMergesOverlay(['5710' => '5709']),
    );

    expect(array_column($mapping->plan->entries, 'hadith_number'))->toBe(['5709'])
        ->and($mapping->plan->collection['total_hadith'])->toBe(1);
});

it('counts merged numbers as resolved for completeness', function (): void {
    $mapping = hadithImportMapWithOverlay(
        hadithMergesRecord([hadithMergesText('5709'), hadithMergesNoText('5710')], [hadithMergesSection('1', '5709', '5710')]),
        hadithMergesOverlay(['5710' => '5709']),
    );

    expect($mapping->stats->complete)->toBeTrue()
        ->and($mapping->stats->mergedNumbers)->toBe(['5710'])
        ->and($mapping->stats->incompleteNumbers)->toBe([])
        ->and($mapping->stats->noText)->toBe(0)
        ->and($mapping->issues)->toBe([]);
});

it('fails with merge_target_missing when the covering row is outside every range', function (): void {
    $mapping = hadithImportMapWithOverlay(
        hadithMergesRecord([hadithMergesText('5709'), hadithMergesNoText('5710')], [hadithMergesSection('1', '1', '2')]),
        hadithMergesOverlay(['5710' => '5709']),
    );

    expect(hadithImportCodes($mapping->issues))->toContain('merge_target_missing')
        ->and($mapping->stats->complete)->toBeFalse()
        ->and($mapping->stats->incompleteReasons['5710'])->toBe('merge_target_missing');
});

it('fails with merge_range_overlaps_row when another row lies inside the span', function (): void {
    $mapping = hadithImportMapWithOverlay(
        hadithMergesRecord(
            [hadithMergesText('5709'), hadithMergesText('5710'), hadithMergesNoText('5711')],
            [hadithMergesSection('1', '5709', '5711')],
        ),
        hadithMergesOverlay(['5711' => '5709']),
    );

    $issues = app(HadithCollectionValidator::class)->validate('bukhari', $mapping);

    expect(hadithImportCodes($issues))->toContain('merge_range_overlaps_row');
});

it('refuses a merge into a row of another book', function (): void {
    $mapping = hadithImportMapWithOverlay(
        hadithMergesRecord(
            [hadithMergesText('1'), hadithMergesText('2'), hadithMergesNoText('3'), hadithMergesText('4')],
            [hadithMergesSection('1', '1', '2'), hadithMergesSection('2', '3', '4')],
        ),
        hadithMergesOverlay(['3' => '2']),
    );

    expect(hadithImportCodes($mapping->issues))->toContain('merge_range_crosses_book');
});

it('rejects a merge for a number that has text', function (): void {
    $source = hadithMergesRecord([hadithMergesText('5708'), hadithMergesText('5709')], [hadithMergesSection('1', '5708', '5709')]);

    expect(fn () => hadithMergesBuild($source, hadithMergesList('5709', '5708')))
        ->toThrow(HadithDataFileException::class, 'merge_number_has_text');
});

it('rejects a merge whose covering number has no text', function (): void {
    $source = hadithMergesRecord([hadithMergesNoText('5710'), hadithMergesNoText('5711')], [hadithMergesSection('1', '5710', '5711')]);

    expect(fn () => hadithMergesBuild($source, hadithMergesList('5710', '5711')))
        ->toThrow(HadithDataFileException::class, 'merge_target_missing');
});

it('rejects a merge into itself and a number the edition does not have', function (): void {
    $source = hadithMergesRecord([hadithMergesNoText('5710')], [hadithMergesSection('1', '5710', '5710')]);

    expect(fn () => hadithMergesBuild($source, hadithMergesList('5710', '5710')))
        ->toThrow(HadithDataFileException::class, 'merge_into_self');

    expect(fn () => hadithMergesBuild($source, hadithMergesList('9999', '5710')))
        ->toThrow(HadithDataFileException::class, 'merge_number_unknown');
});

it('rejects a merged number that is also a fill', function (): void {
    $source = hadithMergesRecord([hadithMergesText('5709'), hadithMergesNoText('5710')], [hadithMergesSection('1', '5709', '5710')]);
    $directory = hadithGapsFixtureFile(
        'bukhari',
        fills: [['number' => '5710', 'origin' => 'openiti', 'source_key' => 'openiti:bukhari:5710', 'unit' => 1, 'text_ar' => 'FIXTURE text 5710', 'source_text_sha256' => hash('sha256', 'FIXTURE text 5710')]],
        merges: hadithMergesList('5710', '5709'),
    );

    expect(fn () => (new HadithOverlayBuilder(new HadithDataFiles($directory), app(HadithRangeCorrections::class), app(HadithExtraBooks::class)))->build('bukhari', $source, ['openiti' => 1, 'hadithapicom' => 2]))
        ->toThrow(HadithDataFileException::class, 'number_repeated');
});

it('ignores the merges of a collection with no gaps file', function (): void {
    $directory = storage_path('framework/testing/hadith-gaps-'.getmypid());
    File::ensureDirectoryExists($directory);
    config(['hadith.data_files' => []]);

    $overlay = (new HadithOverlayBuilder(new HadithDataFiles($directory), app(HadithRangeCorrections::class), app(HadithExtraBooks::class)))->build('bukhari', hadithMergesRecord([hadithMergesText('1')], [hadithMergesSection('1', '1', '1')]), ['openiti' => 1, 'hadithapicom' => 2]);

    expect($overlay)->toBeNull();
});

/*
| The importer and the database.
*/

function hadithMergesResourceId(string $slug = 'bukhari'): int
{
    return (int) Resource::query()->where('group', ResourceGroup::HadithCollections->value)->where('source_key', $slug)->value('id');
}

it('imports a merge: the covering row carries the span and the merged number has no row', function (): void {
    Http::preventStrayRequests();
    Storage::fake('local');
    hadithImportUse(hadithImportFiles());
    hadithImportWarm();
    hadithGapsFixtureFile('bukhari', merges: hadithMergesList('3', '4'));

    $report = hadithImportRun(['bukhari'], false, false, true);
    $resourceId = hadithMergesResourceId();

    expect($report->collections[0]->status)->toBe(CollectionImportResult::STATUS_IMPORTED)
        ->and(HadithEntry::query()->where('resource_id', $resourceId)->where('hadith_number', '4')->value('number_first'))->toBe('3')
        ->and(HadithEntry::query()->where('resource_id', $resourceId)->where('hadith_number', '4')->value('number_last'))->toBe('4')
        ->and(HadithEntry::query()->where('resource_id', $resourceId)->where('hadith_number', '4')->value('source_code'))->toBeNull()
        ->and(HadithEntry::query()->where('resource_id', $resourceId)->where('hadith_number', '1')->value('number_first'))->toBeNull()
        ->and(HadithEntry::query()->where('resource_id', $resourceId)->where('hadith_number', '3')->count())->toBe(0)
        ->and(HadithCollection::query()->where('resource_id', $resourceId)->value('total_hadith'))->toBe(4)
        ->and(HadithCollection::query()->where('resource_id', $resourceId)->value('is_complete'))->toBeTrue();
});

it('bumps the version when the gaps file changes, and an identical re-import does not', function (): void {
    Http::preventStrayRequests();
    Storage::fake('local');
    hadithImportUse(hadithImportFiles());
    hadithImportWarm();
    hadithGapsFixtureFile('bukhari', merges: hadithMergesList('3', '4'));

    $first = hadithImportRun(['bukhari'], false, false, true)->collections[0];
    hadithGapsFixtureFile('bukhari', merges: hadithMergesList('3', '4'));
    $same = hadithImportRun(['bukhari'], false, false, true)->collections[0];
    hadithGapsFixtureFile('bukhari', merges: []);
    $changed = hadithImportRun(['bukhari'], false, false, true)->collections[0];

    expect($first->status)->toBe(CollectionImportResult::STATUS_IMPORTED)
        ->and($same->status)->toBe(CollectionImportResult::STATUS_UNCHANGED)
        ->and($changed->versionAfter)->toBeGreaterThan($changed->versionBefore);
});
