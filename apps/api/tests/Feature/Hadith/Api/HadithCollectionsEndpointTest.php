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

it('lists the served collections in the configured order with the exact key set', function (): void {
    $muslim = hadithApiServe(hadithApiCollection('muslim'));
    $bukhari = hadithApiServe(hadithApiCollection('bukhari'));

    $response = $this->getJson('/api/v1/hadith/collections')->assertOk();

    expect($response->json('data'))->toHaveCount(2)
        ->and(array_column($response->json('data'), 'slug'))->toBe(['bukhari', 'muslim'])
        ->and(array_keys($response->json('data.0')))->toEqualCanonicalizing([
            'resource_id', 'slug', 'title_ar', 'title_en', 'author_ar', 'author_en',
            'attribution_ar', 'attribution_en', 'source_url', 'total_hadith', 'books_count',
        ])
        ->and($response->json('data.0.resource_id'))->toBe($bukhari->resource_id)
        ->and($response->json('data.1.resource_id'))->toBe($muslim->resource_id)
        ->and($response->json('next_cursor'))->toBeNull();
});

it('sorts a slug that is not in config/hadith.php after the configured ones', function (): void {
    hadithApiServe(hadithApiCollection('zzzextra'));
    hadithApiServe(hadithApiCollection('nasai'));
    hadithApiServe(hadithApiCollection('aaaextra'));

    $slugs = array_column($this->getJson('/api/v1/hadith/collections')->json('data'), 'slug');

    expect($slugs)->toBe(['nasai', 'aaaextra', 'zzzextra']);
});

it('keeps null titles and authors null', function (): void {
    hadithApiServe(hadithApiCollection('bukhari', ['title_ar' => null, 'title_en' => null, 'author_ar' => null, 'author_en' => null]));

    $item = $this->getJson('/api/v1/hadith/collections')->json('data.0');

    expect($item)->toHaveKeys(['title_ar', 'title_en', 'author_ar', 'author_en'])
        ->and($item['title_ar'])->toBeNull()
        ->and($item['title_en'])->toBeNull()
        ->and($item['author_ar'])->toBeNull()
        ->and($item['author_en'])->toBeNull();
});

it('returns no text, grade or internal columns', function (): void {
    hadithApiServe(hadithApiCollection('bukhari'));

    $item = $this->getJson('/api/v1/hadith/collections')->assertOk()->json('data.0');

    expect(array_keys($item))->not->toContain('grades', 'text_search', 'source_key', 'source_id', 'source_version', 'imported_at', 'id');
});

it('returns an empty list when nothing is served', function (): void {
    hadithApiCollection('bukhari');

    $this->getJson('/api/v1/hadith/collections')
        ->assertOk()
        ->assertExactJson(['data' => [], 'next_cursor' => null]);
});

it('sends a public cache header and an ETag, and answers If-None-Match with 304', function (): void {
    hadithApiServe(hadithApiCollection('bukhari'));

    $first = $this->getJson('/api/v1/hadith/collections')->assertOk()->assertHeader('Cache-Control', 'max-age=300, public');
    $etag = $first->headers->get('ETag');

    expect($etag)->toStartWith('"');

    $this->withHeaders(['If-None-Match' => $etag])
        ->getJson('/api/v1/hadith/collections')
        ->assertStatus(304);
});

it('returns the same body and ETag for Accept-Language ar and en', function (): void {
    hadithApiServe(hadithApiCollection('bukhari'));

    $en = $this->getJson('/api/v1/hadith/collections')->assertOk();
    $ar = $this->withHeaders(['Accept-Language' => 'ar'])->getJson('/api/v1/hadith/collections')->assertOk();

    expect($ar->getContent())->toBe($en->getContent())
        ->and($ar->headers->get('ETag'))->toBe($en->headers->get('ETag'));
});
