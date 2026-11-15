<?php

declare(strict_types=1);

require_once __DIR__.'/Support/seerah-helpers.php';

use App\Domains\Content\Models\Resource;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\Support\SeerahFixture;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Storage::fake('local');
    SeerahFixture::applyConfig();
    $this->withHeaders([
        'Accept' => 'application/json',
        'Accept-Language' => 'en',
    ]);
});

it('lists no book before a book is served', function (): void {
    seerahFixtureImport();

    $this->getJson('/api/v1/seerah/books')
        ->assertOk()
        ->assertJson(['data' => [], 'next_cursor' => null]);
});

it('lists a served book with its pack resource id and the exact key set', function (): void {
    seerahFixtureImport();
    $resource = Resource::query()->where('group', 'seerah')->firstOrFail();
    seerahServe($resource->id);

    $response = $this->getJson('/api/v1/seerah/books')->assertOk();

    expect($response->json('data'))->toHaveCount(1)
        ->and(array_keys($response->json('data.0')))->toEqualCanonicalizing([
            'resource_id', 'slug', 'title_ar', 'author_ar', 'edition_ar', 'attribution_ar', 'attribution_en',
            'sections_count', 'paragraphs_count', 'places_count', 'events_count', 'routes_count',
        ])
        ->and($response->json('data.0.resource_id'))->toBe($resource->id)
        ->and($response->json('data.0.slug'))->toBe('nur-al-yaqin')
        ->and($response->json('data.0.events_count'))->toBe(3)
        ->and($response->json('next_cursor'))->toBeNull();
});

it('does not list a book whose pack has not been built', function (): void {
    seerahFixtureImport();

    $this->getJson('/api/v1/seerah/books')->assertOk()->assertJsonPath('data', []);
});

it('sends an ETag and answers 304 to a matching If-None-Match', function (): void {
    seerahFixtureImport();
    seerahServe(Resource::query()->where('group', 'seerah')->firstOrFail()->id);

    $etag = $this->getJson('/api/v1/seerah/books')->assertOk()->headers->get('ETag');

    expect($etag)->not->toBeNull();

    $this->withHeaders(['If-None-Match' => $etag])
        ->get('/api/v1/seerah/books')
        ->assertStatus(304);
});

it('renders an unknown path under seerah as problem details', function (): void {
    $this->getJson('/api/v1/seerah/books/unknown')
        ->assertNotFound()
        ->assertHeader('Content-Type', 'application/problem+json')
        ->assertJsonPath('code', 'not_found');
});
