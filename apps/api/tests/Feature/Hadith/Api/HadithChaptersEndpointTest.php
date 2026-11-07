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

it('returns an empty list for a book that has no chapters', function (): void {
    $collection = hadithApiServe(hadithApiCollection('bukhari'));
    hadithApiBook($collection, 1, '1');

    $this->getJson('/api/v1/hadith/collections/bukhari/books/1/chapters')
        ->assertOk()
        ->assertExactJson(['data' => [], 'next_cursor' => null]);
});

it('returns chapters in position order with the exact key set and no source url or text', function (): void {
    $collection = hadithApiServe(hadithApiCollection('bukhari'));
    $book = hadithApiBook($collection, 1, '1');
    hadithApiChapter($collection, $book, 2, 2);
    hadithApiChapter($collection, $book, 1, 1);

    $response = $this->getJson('/api/v1/hadith/collections/bukhari/books/1/chapters')->assertOk();

    expect(array_column($response->json('data'), 'chapter_number'))->toBe([1, 2])
        ->and(array_keys($response->json('data.0')))->toEqualCanonicalizing([
            'chapter_number', 'title_ar', 'title_en', 'position', 'hadith_count',
        ]);
});

it('lists only the chapters of the requested book', function (): void {
    $collection = hadithApiServe(hadithApiCollection('bukhari'));
    $first = hadithApiBook($collection, 1, '1');
    $second = hadithApiBook($collection, 2, '2');
    hadithApiChapter($collection, $first, 1, 1);
    hadithApiChapter($collection, $second, 1, 7);

    expect(array_column($this->getJson('/api/v1/hadith/collections/bukhari/books/2/chapters')->json('data'), 'chapter_number'))
        ->toBe([7]);
});

it('pages chapters by cursor', function (): void {
    $collection = hadithApiServe(hadithApiCollection('bukhari'));
    $book = hadithApiBook($collection, 1, '1');

    foreach (range(1, 3) as $number) {
        hadithApiChapter($collection, $book, $number, $number);
    }

    $first = $this->getJson('/api/v1/hadith/collections/bukhari/books/1/chapters?limit=2')->assertOk();
    $second = $this->getJson('/api/v1/hadith/collections/bukhari/books/1/chapters?limit=2&cursor='.$first->json('next_cursor'))->assertOk();

    expect(array_column($first->json('data'), 'chapter_number'))->toBe([1, 2])
        ->and(array_column($second->json('data'), 'chapter_number'))->toBe([3])
        ->and($second->json('next_cursor'))->toBeNull();
});

it('returns 404 not_found with the book detail for an unknown book number in en and ar', function (string $language, string $detail): void {
    hadithApiServe(hadithApiCollection('bukhari'));

    $this->withHeaders(['Accept-Language' => $language])
        ->getJson('/api/v1/hadith/collections/bukhari/books/999/chapters')
        ->assertNotFound()
        ->assertJsonPath('code', 'not_found')
        ->assertJsonPath('detail', $detail);
})->with([
    'en' => ['en', 'The book was not found.'],
    'ar' => ['ar', 'الكتاب غير موجود.'],
]);

it('returns 404 hadith_collection_unavailable for an unserved collection', function (): void {
    hadithApiCollection('bukhari');

    $this->getJson('/api/v1/hadith/collections/bukhari/books/1/chapters')
        ->assertNotFound()
        ->assertJsonPath('code', 'not_found')
        ->assertJsonPath('detail', "This collection isn't available.");
});

it('sends an ETag and answers 304', function (): void {
    $collection = hadithApiServe(hadithApiCollection('bukhari'));
    hadithApiBook($collection, 1, '1');

    $etag = $this->getJson('/api/v1/hadith/collections/bukhari/books/1/chapters')->assertOk()->headers->get('ETag');

    $this->withHeaders(['If-None-Match' => $etag])
        ->getJson('/api/v1/hadith/collections/bukhari/books/1/chapters')
        ->assertStatus(304);
});
