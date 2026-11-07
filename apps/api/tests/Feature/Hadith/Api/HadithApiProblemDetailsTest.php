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
    $this->withHeaders(['Accept' => 'application/json']);
});

it('renders an unavailable collection as 404 not_found with the detail in each language', function (string $language, string $detail): void {
    hadithApiCollection('bukhari');

    $this->withHeaders(['Accept-Language' => $language])
        ->getJson('/api/v1/hadith/collections/bukhari/books')
        ->assertNotFound()
        ->assertHeader('Content-Type', 'application/problem+json')
        ->assertJsonPath('status', 404)
        ->assertJsonPath('code', 'not_found')
        ->assertJsonPath('detail', $detail);
})->with([
    'en' => ['en', "This collection isn't available."],
    'ar' => ['ar', 'هذه المجموعة غير متاحة'],
]);

it('translates the detail of a missing book, chapter and hadith in both languages', function (string $language, string $bookDetail, string $chapterDetail, string $hadithDetail): void {
    $collection = hadithApiServe(hadithApiCollection('bukhari'));
    $book = hadithApiBook($collection, 1, '1');
    hadithApiEntry($collection, $book, 1, '1');

    $headers = ['Accept-Language' => $language];

    $this->withHeaders($headers)->getJson('/api/v1/hadith/collections/bukhari/books/9/chapters')
        ->assertNotFound()->assertJsonPath('code', 'not_found')->assertJsonPath('detail', $bookDetail);
    $this->withHeaders($headers)->getJson('/api/v1/hadith/collections/bukhari/books/1/hadiths?chapter=9')
        ->assertNotFound()->assertJsonPath('code', 'not_found')->assertJsonPath('detail', $chapterDetail);
    $this->withHeaders($headers)->getJson('/api/v1/hadith/collections/bukhari/hadiths/9')
        ->assertNotFound()->assertJsonPath('code', 'not_found')->assertJsonPath('detail', $hadithDetail);
})->with([
    'en' => ['en', 'The book was not found.', 'The chapter was not found.', 'The hadith was not found.'],
    'ar' => ['ar', 'الكتاب غير موجود.', 'الباب غير موجود.', 'الحديث غير موجود.'],
]);

it('leaves the existing unknown-route code unchanged', function (): void {
    $this->getJson('/api/v1/hadith/nothing-here/at-all')
        ->assertNotFound()
        ->assertJsonPath('code', 'not_found');
});
