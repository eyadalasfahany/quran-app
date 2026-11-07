<?php

declare(strict_types=1);

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Models\ContentPack;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Packs\PackBuilder;
use App\Domains\Content\Services\ContentDeliveryService;
use App\Domains\Hadith\Models\HadithCollection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

require_once __DIR__.'/Support/HadithApiFixtures.php';

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Http::preventStrayRequests();
    Storage::fake('local');
    $this->withHeaders([
        'Accept' => 'application/json',
        'Accept-Language' => 'en',
    ]);
});

/**
 * @return list<string>
 */
function hadithApiFiveUrls(string $slug): array
{
    return [
        "/api/v1/hadith/collections/{$slug}/books",
        "/api/v1/hadith/collections/{$slug}/books/1/chapters",
        "/api/v1/hadith/collections/{$slug}/books/1/hadiths",
        "/api/v1/hadith/collections/{$slug}/hadiths/1",
    ];
}

/**
 * Full rows with no pack: how an incomplete collection looks to the API.
 */
function hadithApiFullRows(string $slug): HadithCollection
{
    $collection = hadithApiCollection($slug);
    $book = hadithApiBook($collection, 1, '1');
    $chapter = hadithApiChapter($collection, $book, 1, 1);
    hadithApiEntry($collection, $book, 1, '1', ['chapter_id' => $chapter->id]);

    return $collection;
}

it('hides a collection that has full rows but no pack on every endpoint', function (string $url): void {
    hadithApiServe(hadithApiCollection('bukhari'));
    hadithApiFullRows('muslim');

    $this->getJson(str_replace('bukhari', 'muslim', $url))
        ->assertNotFound()
        ->assertHeader('Content-Type', 'application/problem+json')
        ->assertJsonPath('code', 'not_found');
})->with(fn () => hadithApiFiveUrls('bukhari'));

it('lists only the served collection when the other has full rows but no pack', function (): void {
    hadithApiServe(hadithApiCollection('bukhari'));
    hadithApiFullRows('muslim');

    expect(array_column($this->getJson('/api/v1/hadith/collections')->json('data'), 'slug'))->toBe(['bukhari']);
});

it('hides a collection whose pack row exists but whose file is missing', function (): void {
    $collection = hadithApiServe(hadithApiCollection('bukhari'));
    $pack = ContentPack::query()->where('resource_id', $collection->resource_id)->firstOrFail();

    Storage::disk('local')->delete($pack->path);

    $this->getJson('/api/v1/hadith/collections')->assertOk()->assertExactJson(['data' => [], 'next_cursor' => null]);
    $this->getJson('/api/v1/hadith/collections/bukhari/books')->assertNotFound()
        ->assertJsonPath('detail', "This collection isn't available.");
});

it('hides a collection whose resource is inactive', function (): void {
    $collection = hadithApiServe(hadithApiCollection('bukhari'));
    Resource::query()->whereKey($collection->resource_id)->update(['is_active' => false]);

    $this->getJson('/api/v1/hadith/collections')->assertOk()->assertExactJson(['data' => [], 'next_cursor' => null]);
});

it('hides a collection that has a pack but no hadith_collections row', function (): void {
    $collection = hadithApiCollection('bukhari');
    $resource = Resource::query()->findOrFail($collection->resource_id);
    $resource->update(['group' => ResourceGroup::Tafsirs]);
    hadithApiServe($collection);

    $this->getJson('/api/v1/hadith/collections')->assertOk()->assertExactJson(['data' => [], 'next_cursor' => null]);
});

it('serves a collection once a pack exists and hides it again when the pack file is removed', function (): void {
    $collection = hadithApiCollection('bukhari');
    $book = hadithApiBook($collection, 1, '1');
    hadithApiEntry($collection, $book, 1, '1');

    $this->getJson('/api/v1/hadith/collections/bukhari/books')->assertNotFound();

    hadithApiServe($collection);
    $this->getJson('/api/v1/hadith/collections/bukhari/books')->assertOk();

    $pack = ContentPack::query()->where('resource_id', $collection->resource_id)->firstOrFail();
    Storage::disk('local')->delete($pack->path);

    $this->getJson('/api/v1/hadith/collections/bukhari/books')->assertNotFound();
});

it('lists exactly the hadith_collections resources that the content manifest lists', function (): void {
    foreach (['bukhari', 'muslim', 'nasai'] as $slug) {
        hadithApiServe(hadithApiCollection($slug));
    }
    hadithApiCollection('tirmidhi');

    $served = collect($this->getJson('/api/v1/hadith/collections')->json('data'))
        ->pluck('resource_id')->sort()->values()->all();

    $manifest = collect($this->getJson('/api/v1/content/manifest')->json('resources'))
        ->filter(fn (array $entry): bool => $entry['group'] === 'hadith_collections')
        ->pluck('id')->sort()->values()->all();

    expect($served)->toHaveCount(3)->and($served)->toBe($manifest);
});

it('serves a collection whose pack was built by PackBuilder', function (): void {
    $collection = hadithApiCollection('bukhari');
    $book = hadithApiBook($collection, 1, '1');
    hadithApiEntry($collection, $book, 1, '1');

    app(PackBuilder::class)->build(Resource::query()->findOrFail($collection->resource_id));

    expect(array_column($this->getJson('/api/v1/hadith/collections')->json('data'), 'slug'))->toBe(['bukhari']);
});

it('ContentDeliveryService::servedResourceIds returns only active, packed, present, same-group ids in ascending order', function (): void {
    $bukhari = hadithApiServe(hadithApiCollection('bukhari'));
    $muslim = hadithApiServe(hadithApiCollection('muslim'));
    $nasai = hadithApiServe(hadithApiCollection('nasai'));
    hadithApiCollection('tirmidhi');
    $tafsir = Resource::factory()->create(['group' => ResourceGroup::Tafsirs, 'is_active' => true, 'version' => 1]);
    app(PackBuilder::class)->build($tafsir);

    $ids = app(ContentDeliveryService::class)->servedResourceIds(ResourceGroup::HadithCollections);

    expect($ids)->toBe([$bukhari->resource_id, $muslim->resource_id, $nasai->resource_id])
        ->and($ids)->not->toContain($tafsir->id);
});
