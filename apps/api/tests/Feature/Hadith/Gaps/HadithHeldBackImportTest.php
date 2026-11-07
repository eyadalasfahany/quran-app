<?php

declare(strict_types=1);

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Jobs\BuildContentPackJob;
use App\Domains\Content\Models\ContentPack;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Services\ContentDeliveryService;
use App\Domains\Hadith\Exceptions\HadithDataFileException;
use App\Domains\Hadith\Import\Records\CollectionImportResult;
use App\Domains\Hadith\Models\HadithCollection;
use App\Domains\Hadith\Services\HadithImporter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

require_once __DIR__.'/../Support/HadithFixtureFiles.php';
require_once __DIR__.'/../Support/HadithImportFixtures.php';

// ADR 0076 «Rule, 7 Nov 2026» (step 6b.1): an incomplete collection is written, held back and never packed or served.
uses(RefreshDatabase::class);

beforeEach(function (): void {
    Http::preventStrayRequests();
    Storage::fake('local');
    config(['hadith.range_corrections' => [], 'hadith.completeness_exceptions' => []]);
    hadithImportUse(hadithImportFiles());
    hadithImportWarm();
});

afterEach(function (): void {
    File::deleteDirectory((string) config('content_sources.cache_root'));
});

function heldBackResource(string $slug = 'bukhari'): ?Resource
{
    return Resource::query()->where('group', ResourceGroup::HadithCollections->value)->where('source_key', $slug)->first();
}

it('writes an incomplete collection, marks it inactive and queues no pack', function (): void {
    Queue::fake();

    $report = app(HadithImporter::class)->run(['bukhari'], false, false, false);
    $result = $report->collections[0];
    $resource = heldBackResource();

    expect($result->status)->toBe(CollectionImportResult::STATUS_HELD_BACK)
        ->and($result->failed())->toBeFalse()
        ->and($report->succeeded())->toBeTrue()
        ->and($resource)->not->toBeNull()
        ->and($resource->is_active)->toBeFalse()
        ->and(HadithCollection::query()->where('resource_id', $resource->id)->value('is_complete'))->toBeFalse()
        ->and(HadithCollection::query()->where('resource_id', $resource->id)->value('incomplete_count'))->toBe(1)
        ->and($result->pack)->toBe(['built' => false, 'queued' => false, 'reason' => 'incomplete']);

    Queue::assertNothingPushed();
});

it('writes a complete collection active and queues the pack', function (): void {
    Queue::fake();
    config(['hadith.completeness_exceptions' => ['bukhari' => ['3']]]);

    $result = app(HadithImporter::class)->run(['bukhari'], false, false, false)->collections[0];

    expect($result->status)->toBe(CollectionImportResult::STATUS_IMPORTED)
        ->and(heldBackResource()->is_active)->toBeTrue()
        ->and(HadithCollection::query()->where('resource_id', heldBackResource()->id)->value('is_complete'))->toBeTrue();

    Queue::assertPushed(BuildContentPackJob::class, 1);
});

it('deactivates a resource when a re-import turns it from complete to incomplete', function (): void {
    config(['hadith.completeness_exceptions' => ['bukhari' => ['3']]]);
    app(HadithImporter::class)->run(['bukhari'], false, false, true);
    $before = heldBackResource()->version;

    config(['hadith.completeness_exceptions' => []]);
    $result = app(HadithImporter::class)->run(['bukhari'], false, false, true)->collections[0];

    expect($result->status)->toBe(CollectionImportResult::STATUS_HELD_BACK)
        ->and(heldBackResource()->is_active)->toBeFalse()
        ->and(heldBackResource()->version)->toBe($before + 1);
});

it('reactivates when it becomes complete again', function (): void {
    app(HadithImporter::class)->run(['bukhari'], false, false, true);
    expect(heldBackResource()->is_active)->toBeFalse();

    config(['hadith.completeness_exceptions' => ['bukhari' => ['3']]]);
    $result = app(HadithImporter::class)->run(['bukhari'], false, false, true)->collections[0];

    expect($result->status)->toBe(CollectionImportResult::STATUS_IMPORTED)
        ->and(heldBackResource()->is_active)->toBeTrue();
});

it('keeps a held-back collection out of the manifest, and serves a complete one', function (): void {
    app(HadithImporter::class)->run(['bukhari'], false, false, true);

    expect(app(ContentDeliveryService::class)->servedResourceIds(ResourceGroup::HadithCollections))
        ->not->toContain(heldBackResource()->id);

    config(['hadith.completeness_exceptions' => ['bukhari' => ['3']]]);
    app(HadithImporter::class)->run(['bukhari'], false, true, false);

    expect(app(ContentDeliveryService::class)->servedResourceIds(ResourceGroup::HadithCollections))
        ->toContain(heldBackResource()->id);
});

it('does not build a pack with --build-packs for an incomplete collection', function (): void {
    Queue::fake();

    $result = app(HadithImporter::class)->run(['bukhari'], false, true, false)->collections[0];

    expect($result->status)->toBe(CollectionImportResult::STATUS_HELD_BACK)
        ->and($result->pack)->toBe(['built' => false, 'queued' => false, 'reason' => 'incomplete'])
        ->and(ContentPack::query()->count())->toBe(0);

    Queue::assertNothingPushed();
});

it('reports complete: no for an unchanged held-back collection', function (): void {
    app(HadithImporter::class)->run(['bukhari'], false, false, true);

    $result = app(HadithImporter::class)->run(['bukhari'], false, false, true)->collections[0];
    $report = app(HadithImporter::class)->run(['bukhari'], false, false, true)->toReport();

    expect($result->status)->toBe(CollectionImportResult::STATUS_UNCHANGED)
        ->and($result->complete)->toBeFalse()
        ->and($result->incompleteCount)->toBe(1)
        ->and($report['collections'][0]['counts']['complete'])->toBeFalse()
        ->and($report['collections'][0]['counts']['incomplete'])->toBe(1);
});

it('fails one collection on a bad data file and still imports the next', function (): void {
    config(['hadith.completeness_exceptions' => ['bukhari' => [['not a number']], 'muslim' => ['3']]]);

    $report = app(HadithImporter::class)->run(['bukhari', 'muslim'], false, false, true);

    expect($report->collections[0]->status)->toBe(CollectionImportResult::STATUS_FAILED)
        ->and($report->collections[0]->failure)->toContain('completeness_exceptions')
        ->and($report->collections[1]->status)->toBe(CollectionImportResult::STATUS_IMPORTED)
        ->and($report->succeeded())->toBeFalse();
});

it('refuses an unknown slug in completeness exceptions before any work', function (): void {
    config(['hadith.completeness_exceptions' => ['nope' => ['1']]]);

    expect(fn () => app(HadithImporter::class)->run(['bukhari'], false, false, true))
        ->toThrow(HadithDataFileException::class, 'unknown collection');
});
