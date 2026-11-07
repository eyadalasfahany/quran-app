<?php

declare(strict_types=1);

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

it('lists books in position order with the exact key set and no id', function (): void {
    $collection = hadithApiServe(hadithApiCollection('bukhari'));
    hadithApiBook($collection, 2, '2');
    hadithApiBook($collection, 1, '1');

    $response = $this->getJson('/api/v1/hadith/collections/bukhari/books')->assertOk();

    expect(array_column($response->json('data'), 'book_number'))->toBe(['1', '2'])
        ->and(array_keys($response->json('data.0')))->toEqualCanonicalizing([
            'book_number', 'title_ar', 'title_en', 'position', 'hadith_count',
        ]);
});

it('pages books by cursor without repeats and lists book number 0', function (): void {
    $collection = hadithApiServe(hadithApiCollection('bukhari'));

    foreach (range(1, 5) as $position) {
        hadithApiBook($collection, $position, (string) ($position - 1));
    }

    $first = $this->getJson('/api/v1/hadith/collections/bukhari/books?limit=2')->assertOk();
    $second = $this->getJson('/api/v1/hadith/collections/bukhari/books?limit=2&cursor='.$first->json('next_cursor'))->assertOk();
    $third = $this->getJson('/api/v1/hadith/collections/bukhari/books?limit=2&cursor='.$second->json('next_cursor'))->assertOk();

    expect(array_column($first->json('data'), 'book_number'))->toBe(['0', '1'])
        ->and(array_column($second->json('data'), 'book_number'))->toBe(['2', '3'])
        ->and(array_column($third->json('data'), 'book_number'))->toBe(['4'])
        ->and($first->json('next_cursor'))->not->toBeNull()
        ->and($second->json('next_cursor'))->not->toBeNull()
        ->and($third->json('next_cursor'))->toBeNull();
});

it('rejects a malformed cursor, limit 0 and limit 501 with 422 validation_failed', function (string $query): void {
    $collection = hadithApiServe(hadithApiCollection('bukhari'));
    hadithApiBook($collection, 1, '1');

    $this->getJson('/api/v1/hadith/collections/bukhari/books?'.$query)
        ->assertUnprocessable()
        ->assertJsonPath('code', 'validation_failed');
})->with([
    'malformed cursor' => ['cursor=!!!'],
    'limit 0' => ['limit=0'],
    'limit 501' => ['limit=501'],
]);

it('does not show books of another served collection', function (): void {
    $bukhari = hadithApiServe(hadithApiCollection('bukhari'));
    $muslim = hadithApiServe(hadithApiCollection('muslim'));
    hadithApiBook($bukhari, 1, 'b-only');
    hadithApiBook($muslim, 1, 'm-only');

    expect(array_column($this->getJson('/api/v1/hadith/collections/bukhari/books')->json('data'), 'book_number'))
        ->toBe(['b-only']);
});

it('returns 404 hadith_collection_unavailable as not_found for an unknown slug', function (): void {
    $this->getJson('/api/v1/hadith/collections/zzz/books')
        ->assertNotFound()
        ->assertHeader('Content-Type', 'application/problem+json')
        ->assertJsonPath('code', 'not_found')
        ->assertJsonPath('detail', "This collection isn't available.");
});

it('returns plain 404 not_found for a slug that fails the route pattern', function (): void {
    $this->getJson('/api/v1/hadith/collections/BAD_SLUG/books')
        ->assertNotFound()
        ->assertJsonPath('code', 'not_found');
});

it('sends an ETag and answers 304', function (): void {
    $collection = hadithApiServe(hadithApiCollection('bukhari'));
    hadithApiBook($collection, 1, '1');

    $etag = $this->getJson('/api/v1/hadith/collections/bukhari/books')->assertOk()->headers->get('ETag');

    $this->withHeaders(['If-None-Match' => $etag])
        ->getJson('/api/v1/hadith/collections/bukhari/books')
        ->assertStatus(304);
});

it('returns the same body for ar and en', function (): void {
    $collection = hadithApiServe(hadithApiCollection('bukhari'));
    hadithApiBook($collection, 1, '1');

    $en = $this->getJson('/api/v1/hadith/collections/bukhari/books')->assertOk()->getContent();
    $ar = $this->withHeaders(['Accept-Language' => 'ar'])->getJson('/api/v1/hadith/collections/bukhari/books')->assertOk()->getContent();

    expect($ar)->toBe($en);
});
