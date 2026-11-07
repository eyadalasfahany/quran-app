<?php

declare(strict_types=1);

use App\Domains\Content\Models\Resource;
use App\Domains\Content\Packs\HadithPackReadiness;
use App\Domains\Content\Packs\PackBuilder;
use App\Domains\Content\Packs\PackBuildException;
use Database\Factories\HadithCollectionFactory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

// ADR 0076 «Rule, 7 Nov 2026»: the pack builder refuses an incomplete hadith collection (step 6b.1).
uses(RefreshDatabase::class);

beforeEach(function (): void {
    Storage::fake('local');
});

it('refuses to build a pack for a collection with is_complete false', function (): void {
    $collection = HadithCollectionFactory::new()->incomplete(2)->create();
    $resource = Resource::query()->findOrFail($collection->resource_id);

    expect(fn () => app(PackBuilder::class)->build($resource))
        ->toThrow(PackBuildException::class, 'incomplete or not imported');
});

it('builds for a complete collection', function (): void {
    $collection = HadithCollectionFactory::new()->create();
    $resource = Resource::query()->findOrFail($collection->resource_id);

    $pack = app(PackBuilder::class)->build($resource);

    expect($pack->resourceId)->toBe($resource->id);
});

it('refuses when the collection row is missing', function (): void {
    $resourceId = (int) DB::table('resources')->insertGetId([
        'source_id' => (int) DB::table('content_sources')->where('code', 'fawazahmed0')->value('id'),
        'group' => 'hadith_collections',
        'source_key' => 'fixture-no-row',
        'name' => 'FIXTURE hadith collection',
        'language_code' => 'ar',
        'direction' => 'rtl',
        'version' => 1,
        'is_active' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    expect(fn () => app(HadithPackReadiness::class)->assertReady($resourceId))
        ->toThrow(PackBuildException::class, 'incomplete or not imported');
});
