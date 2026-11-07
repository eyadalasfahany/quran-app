<?php

declare(strict_types=1);

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Models\Resource;
use App\Domains\Hadith\Import\Records\CollectionImportResult;
use App\Domains\Hadith\Import\Records\HadithImportPlan;
use App\Domains\Hadith\Import\Records\MappingResult;
use App\Domains\Hadith\Models\HadithCollection;
use App\Domains\Hadith\Models\HadithEntry;
use App\Domains\Hadith\Overlay\HadithDataFiles;
use App\Domains\Hadith\Overlay\HadithOverlay;
use App\Domains\Hadith\Overlay\HadithOverlayBuilder;
use App\Domains\Hadith\Services\HadithExtraBooks;
use App\Domains\Hadith\Services\HadithImporter;
use App\Domains\Hadith\Services\HadithRangeCorrections;
use App\Domains\Hadith\Sources\Records\SourceSection;
use App\Domains\Hadith\Validation\HadithCollectionValidator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

require_once __DIR__.'/../Support/HadithFixtureFiles.php';
require_once __DIR__.'/../Support/HadithImportFixtures.php';
require_once __DIR__.'/../Support/HadithGapFixtures.php';

uses(RefreshDatabase::class);

/*
| Placeholder rows (ADR 0076, rule amended 7 Nov 2026): a number unrecoverable from every source gets a row with empty text and
| source_code unavailable; a number never tried holds the collection back. Placeholder text only.
*/

beforeEach(function (): void {
    Http::preventStrayRequests();
    Storage::fake('local');
    config(['hadith.range_corrections' => [], 'hadith.completeness_exceptions' => []]);
    hadithImportUse(hadithImportFiles());
    hadithImportWarm();
});

afterEach(function (): void {
    File::deleteDirectory(gapsDataDirectory());
    File::deleteDirectory(gapsOpenItiDirectory());
    File::deleteDirectory((string) config('content_sources.cache_root'));
});

function unavailableResourceId(): int
{
    return (int) Resource::query()->where('group', ResourceGroup::HadithCollections->value)->where('source_key', 'bukhari')->value('id');
}

it('an unresolved entry becomes a placeholder and the collection is released', function (): void {
    hadithGapsFixtureFile('bukhari', unresolved: [['number' => '3', 'reason' => 'unknown_after_measurement']]);

    $result = hadithImportRun(['bukhari'], false, false, true)->collections[0];
    $resourceId = unavailableResourceId();
    $row = HadithEntry::query()->where('resource_id', $resourceId)->where('hadith_number', '3')->first();
    $collection = HadithCollection::query()->where('resource_id', $resourceId)->first();

    expect($result->status)->toBe(CollectionImportResult::STATUS_IMPORTED)
        ->and($row?->text_ar)->toBe('')
        ->and($row?->text_search)->toBe('')
        ->and($row?->source_code)->toBe('unavailable')
        ->and($row?->source_key)->toBe('unavailable:bukhari:3')
        ->and($collection?->is_complete)->toBeTrue()
        ->and($collection?->unavailable_count)->toBe(1)
        ->and(Resource::query()->find($resourceId)?->is_active)->toBeTrue();
});

it('an untried no-text number still holds the collection back', function (): void {
    $result = hadithImportRun(['bukhari'], false, false, true)->collections[0];
    $collection = HadithCollection::query()->where('resource_id', unavailableResourceId())->first();

    expect($result->status)->toBe(CollectionImportResult::STATUS_HELD_BACK)
        ->and($collection?->is_complete)->toBeFalse()
        ->and($collection?->unavailable_count)->toBe(0);
});

it('a hadithapi.com key that was missing is never a placeholder: the number was not tried', function (): void {
    hadithGapsFixtureFile('bukhari', unresolved: [['number' => '3', 'reason' => 'hadithapi_key_missing']]);

    $result = hadithImportRun(['bukhari'], false, false, true)->collections[0];

    expect($result->status)->toBe(CollectionImportResult::STATUS_HELD_BACK)
        ->and(HadithEntry::query()->where('resource_id', unavailableResourceId())->where('source_code', 'unavailable')->count())->toBe(0);
});

it('the text-integrity check skips placeholder rows', function (): void {
    hadithGapsFixtureFile('bukhari', unresolved: [['number' => '3', 'reason' => 'unknown_after_measurement']]);
    hadithImportRun(['bukhari'], false, false, true);

    $verified = app(HadithImporter::class)->verify(['bukhari'])->collections[0];

    expect($verified->status)->toBe(CollectionImportResult::STATUS_VERIFIED);
});

it('the pack carries the placeholder row with empty text and source_code unavailable', function (): void {
    hadithGapsFixtureFile('bukhari', unresolved: [['number' => '3', 'reason' => 'unknown_after_measurement']]);
    hadithImportRun(['bukhari'], false, false, true);

    $packed = collect(hadithImportPack(unavailableResourceId())['tables']['hadith_entries'])->keyBy('hadith_number');

    expect($packed['3']['text_ar'])->toBe('')
        ->and($packed['3']['source_code'])->toBe('unavailable');
});

it('the builder keeps hadithapi.com-missing numbers out of the placeholders and maps the others', function (): void {
    $directory = hadithGapsFixtureFile('bukhari', unresolved: [
        ['number' => '3', 'reason' => 'hadithapi_key_missing'],
        ['number' => '4', 'reason' => 'recheck_neighbour_failed'],
    ]);
    $source = hadithImportRecord([hadithImportHadith('3', null, '2'), hadithImportHadith('4', null, '2')], hadithImportSections());

    $overlay = (new HadithOverlayBuilder(new HadithDataFiles($directory), app(HadithRangeCorrections::class), app(HadithExtraBooks::class)))
        ->build('bukhari', $source, ['openiti' => 1, 'hadithapicom' => 2]);

    expect($overlay?->unavailable)->toBe(['4']);
});

it('a placeholder with text in the edition is refused', function (): void {
    $overlay = new HadithOverlay(merges: [], originSourceIds: [], originVersions: [], unavailable: ['1']);
    $mapping = hadithImportMapWithOverlay(hadithImportRecord([hadithImportHadith('1', 'FIXTURE text 1 — not a hadith', '1')]), $overlay);

    expect(hadithImportCodes($mapping->issues))->toContain('unavailable_has_text');
});

it('a placeholder outside every range stays incomplete', function (): void {
    $overlay = new HadithOverlay(merges: [], originSourceIds: [], originVersions: [], unavailable: ['9']);
    $mapping = hadithImportMapWithOverlay(hadithImportRecord([hadithImportHadith('9', null, '1')], [new SourceSection('1', null, '1', '2', null, null)]), $overlay);

    expect($mapping->stats->complete)->toBeFalse()
        ->and($mapping->stats->incompleteReasons['9'])->toBe('outside_range');
});

it('the validator accepts empty text only for source_code unavailable', function (): void {
    $base = hadithImportMap(hadithImportRecord([hadithImportHadith('1', 'FIXTURE text 1 — not a hadith', '1')]));
    $entry = $base->plan->entries[0];

    $bad = new MappingResult(new HadithImportPlan($base->plan->collection, $base->plan->books, [], [array_replace($entry, ['text_ar' => ''])], []), $base->stats, []);
    $good = new MappingResult(new HadithImportPlan($base->plan->collection, $base->plan->books, [], [array_replace($entry, ['text_ar' => '', 'source_code' => 'unavailable'])], []), $base->stats, []);

    expect(hadithImportCodes(app(HadithCollectionValidator::class)->validate('bukhari', $bad)))->toContain('empty_text')
        ->and(hadithImportCodes(app(HadithCollectionValidator::class)->validate('bukhari', $good)))->not->toContain('empty_text');
});
