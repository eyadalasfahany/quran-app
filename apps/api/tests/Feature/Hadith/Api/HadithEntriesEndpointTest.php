<?php

declare(strict_types=1);

use Database\Factories\HadithEntryFactory;
use Database\Factories\HadithGradeFactory;
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

it('lists a book hadith in position order with the exact key set', function (): void {
    $collection = hadithApiServe(hadithApiCollection('bukhari'));
    $book = hadithApiBook($collection, 1, '1');
    hadithApiEntry($collection, $book, 2, '2');
    hadithApiEntry($collection, $book, 1, '1');

    $response = $this->getJson('/api/v1/hadith/collections/bukhari/books/1/hadiths')->assertOk();

    expect(array_column($response->json('data'), 'hadith_number'))->toBe(['1', '2'])
        ->and(array_keys($response->json('data.0')))->toEqualCanonicalizing([
            'hadith_number', 'arabic_number', 'position', 'text_ar', 'source_url', 'book_number', 'chapter_number', 'number_first', 'number_last', 'source_code',
        ])
        ->and($response->json('data.0.chapter_number'))->toBeNull()
        ->and($response->json('data.0.source_url'))->toBeNull()
        ->and($response->json('data.0.book_number'))->toBe('1');
});

it('returns text_ar byte for byte, including the bidi mark and Arabic text', function (): void {
    $collection = hadithApiServe(hadithApiCollection('bukhari'));
    $book = hadithApiBook($collection, 1, '1');
    hadithApiEntry($collection, $book, 1, '1', ['text_ar' => HadithEntryFactory::BIDI_TEXT]);
    hadithApiEntry($collection, $book, 2, '2', ['text_ar' => HadithEntryFactory::ARABIC_TEXT]);

    $items = $this->getJson('/api/v1/hadith/collections/bukhari/books/1/hadiths')->json('data');

    expect($items[0]['text_ar'])->toBe(HadithEntryFactory::BIDI_TEXT)
        ->and($items[1]['text_ar'])->toBe(HadithEntryFactory::ARABIC_TEXT);
});

it('never returns text_search, text_en, narrator_en, source_text_sha256, source_key or an internal id', function (): void {
    $collection = hadithApiServe(hadithApiCollection('bukhari'));
    $book = hadithApiBook($collection, 1, '1');
    hadithApiEntry($collection, $book, 1, '1', ['text_en' => 'FIXTURE english', 'narrator_en' => 'FIXTURE narrator']);

    $body = $this->getJson('/api/v1/hadith/collections/bukhari/books/1/hadiths')->assertOk()->getContent();

    expect($body)->not->toContain('text_search')
        ->and($body)->not->toContain('text_en')
        ->and($body)->not->toContain('narrator_en')
        ->and($body)->not->toContain('source_text_sha256')
        ->and($body)->not->toContain('source_key')
        ->and($body)->not->toContain('"id"');
});

it('returns no grades key while grades are not visible, even when grade rows exist', function (): void {
    $collection = hadithApiServe(hadithApiCollection('bukhari'));
    $book = hadithApiBook($collection, 1, '1');
    $entry = hadithApiEntry($collection, $book, 1, '1');
    HadithGradeFactory::new()->create(['resource_id' => $collection->resource_id, 'entry_id' => $entry->id]);

    $item = $this->getJson('/api/v1/hadith/collections/bukhari/books/1/hadiths')->json('data.0');
    $detail = $this->getJson('/api/v1/hadith/collections/bukhari/hadiths/1')->json();

    expect($item)->not->toHaveKey('grades')
        ->and($detail)->not->toHaveKey('grades');
});

it('returns grades when visible, omits a grade with no grader, and gives [] for an entry with none', function (): void {
    config(['hadith.grades_visible' => true]);

    $collection = hadithApiServe(hadithApiCollection('bukhari'));
    $book = hadithApiBook($collection, 1, '1');
    $graded = hadithApiEntry($collection, $book, 1, '1');
    hadithApiEntry($collection, $book, 2, '2');
    HadithGradeFactory::new()->create(['resource_id' => $collection->resource_id, 'entry_id' => $graded->id]);
    HadithGradeFactory::new()->ungraded()->create(['resource_id' => $collection->resource_id, 'entry_id' => $graded->id]);

    $items = $this->getJson('/api/v1/hadith/collections/bukhari/books/1/hadiths')->json('data');
    $detail = $this->getJson('/api/v1/hadith/collections/bukhari/hadiths/2')->json();

    expect($items[0]['grades'])->toBe([['grade' => 'FIXTURE grade', 'graded_by' => 'FIXTURE grader']])
        ->and($items[1]['grades'])->toBe([])
        ->and($detail['grades'])->toBe([]);
});

it('filters by ?chapter= and returns only that chapter hadith in position order', function (): void {
    $collection = hadithApiServe(hadithApiCollection('bukhari'));
    $book = hadithApiBook($collection, 1, '1');
    $one = hadithApiChapter($collection, $book, 1, 1);
    $two = hadithApiChapter($collection, $book, 2, 2);
    hadithApiEntry($collection, $book, 1, '1', ['chapter_id' => $one->id]);
    hadithApiEntry($collection, $book, 2, '2', ['chapter_id' => $two->id]);
    hadithApiEntry($collection, $book, 3, '3', ['chapter_id' => $one->id]);

    $items = $this->getJson('/api/v1/hadith/collections/bukhari/books/1/hadiths?chapter=1')->assertOk()->json('data');

    expect(array_column($items, 'hadith_number'))->toBe(['1', '3'])
        ->and(array_column($items, 'chapter_number'))->toBe([1, 1]);
});

it('returns 404 for an unknown chapter number, for a chapter of another book, and for ?chapter= on a book with no chapters', function (): void {
    $collection = hadithApiServe(hadithApiCollection('bukhari'));
    $first = hadithApiBook($collection, 1, '1');
    $second = hadithApiBook($collection, 2, '2');
    hadithApiChapter($collection, $first, 1, 1);
    hadithApiEntry($collection, $second, 1, '1');

    $this->getJson('/api/v1/hadith/collections/bukhari/books/1/hadiths?chapter=99')
        ->assertNotFound()->assertJsonPath('detail', 'The chapter was not found.');
    $this->getJson('/api/v1/hadith/collections/bukhari/books/2/hadiths?chapter=1')
        ->assertNotFound()->assertJsonPath('detail', 'The chapter was not found.');
});

it('returns 422 for a non-integer or zero chapter', function (string $query): void {
    $collection = hadithApiServe(hadithApiCollection('bukhari'));
    hadithApiBook($collection, 1, '1');

    $this->getJson('/api/v1/hadith/collections/bukhari/books/1/hadiths?'.$query)
        ->assertUnprocessable()
        ->assertJsonPath('code', 'validation_failed');
})->with(['text' => ['chapter=abc'], 'zero' => ['chapter=0']]);

it('pages hadith by cursor and never repeats or skips one, with and without a chapter filter', function (): void {
    $collection = hadithApiServe(hadithApiCollection('bukhari'));
    $book = hadithApiBook($collection, 1, '1');
    $chapter = hadithApiChapter($collection, $book, 1, 1);

    foreach (range(1, 7) as $position) {
        hadithApiEntry($collection, $book, $position, (string) $position, ['chapter_id' => $chapter->id]);
    }

    $seen = [];
    $url = '/api/v1/hadith/collections/bukhari/books/1/hadiths?limit=3';

    do {
        $page = $this->getJson($url)->assertOk();
        $seen = [...$seen, ...array_column($page->json('data'), 'hadith_number')];
        $url = '/api/v1/hadith/collections/bukhari/books/1/hadiths?limit=3&cursor='.$page->json('next_cursor');
    } while ($page->json('next_cursor') !== null);

    expect($seen)->toBe(['1', '2', '3', '4', '5', '6', '7']);

    $filtered = [];
    $url = '/api/v1/hadith/collections/bukhari/books/1/hadiths?limit=3&chapter=1';

    do {
        $page = $this->getJson($url)->assertOk();
        $filtered = [...$filtered, ...array_column($page->json('data'), 'hadith_number')];
        $url = '/api/v1/hadith/collections/bukhari/books/1/hadiths?limit=3&chapter=1&cursor='.$page->json('next_cursor');
    } while ($page->json('next_cursor') !== null);

    expect($filtered)->toBe(['1', '2', '3', '4', '5', '6', '7']);
});

it('returns an empty list for a book with no hadith', function (): void {
    $collection = hadithApiServe(hadithApiCollection('bukhari'));
    hadithApiBook($collection, 1, '1');

    $this->getJson('/api/v1/hadith/collections/bukhari/books/1/hadiths')
        ->assertOk()
        ->assertExactJson(['data' => [], 'next_cursor' => null]);
});

it('returns 404 not_found for an unknown book and hadith_collection_unavailable for an unserved collection', function (): void {
    hadithApiCollection('muslim');
    $collection = hadithApiServe(hadithApiCollection('bukhari'));
    hadithApiBook($collection, 1, '1');

    $this->getJson('/api/v1/hadith/collections/bukhari/books/404/hadiths')
        ->assertNotFound()->assertJsonPath('detail', 'The book was not found.');
    $this->getJson('/api/v1/hadith/collections/muslim/books/1/hadiths')
        ->assertNotFound()->assertJsonPath('detail', "This collection isn't available.");
});

it('sends an ETag, answers 304 and returns the same body for ar and en', function (): void {
    $collection = hadithApiServe(hadithApiCollection('bukhari'));
    $book = hadithApiBook($collection, 1, '1');
    hadithApiEntry($collection, $book, 1, '1');

    $en = $this->getJson('/api/v1/hadith/collections/bukhari/books/1/hadiths')->assertOk();
    $etag = $en->headers->get('ETag');

    $this->withHeaders(['If-None-Match' => $etag])
        ->getJson('/api/v1/hadith/collections/bukhari/books/1/hadiths')
        ->assertStatus(304);

    $this->flushHeaders();
    $ar = $this->withHeaders([
        'Accept' => 'application/json',
        'Accept-Language' => 'ar',
    ])->getJson('/api/v1/hadith/collections/bukhari/books/1/hadiths')->assertOk();

    expect($ar->getContent())->toBe($en->getContent());
});

it('shows one hadith with its breadcrumb and credit', function (): void {
    $collection = hadithApiServe(hadithApiCollection('bukhari'));
    $book = hadithApiBook($collection, 1, '1');
    $chapter = hadithApiChapter($collection, $book, 1, 1);
    hadithApiEntry($collection, $book, 1, '1', ['chapter_id' => $chapter->id]);
    hadithApiEntry($collection, $book, 2, '2');

    $chaptered = $this->getJson('/api/v1/hadith/collections/bukhari/hadiths/1')->assertOk();
    $unchaptered = $this->getJson('/api/v1/hadith/collections/bukhari/hadiths/2')->assertOk();

    expect(array_keys($chaptered->json()))->toEqualCanonicalizing([
        'hadith_number', 'arabic_number', 'position', 'text_ar', 'source_url', 'book_number', 'chapter_number', 'number_first', 'number_last', 'source_code',
        'collection', 'book', 'chapter',
    ])
        ->and(array_keys($chaptered->json('collection')))->toEqualCanonicalizing([
            'resource_id', 'slug', 'title_ar', 'title_en', 'author_ar', 'author_en', 'attribution_ar', 'attribution_en',
            'source_url', 'total_hadith', 'books_count',
        ])
        ->and(array_keys($chaptered->json('book')))->toEqualCanonicalizing(['book_number', 'title_ar', 'title_en', 'position', 'hadith_count'])
        ->and(array_keys($chaptered->json('chapter')))->toEqualCanonicalizing(['chapter_number', 'title_ar', 'title_en', 'position', 'hadith_count'])
        ->and($chaptered->json('chapter_number'))->toBe(1)
        ->and($unchaptered->json('chapter'))->toBeNull()
        ->and($unchaptered->json('chapter_number'))->toBeNull();
});

it('finds a decimal hadith number such as 2787.2', function (): void {
    $collection = hadithApiServe(hadithApiCollection('bukhari'));
    $book = hadithApiBook($collection, 1, '1');
    HadithEntryFactory::new()->decimalNumber()->create([
        'resource_id' => $collection->resource_id,
        'book_id' => $book->id,
        'position' => 1,
    ]);

    $this->getJson('/api/v1/hadith/collections/bukhari/hadiths/2787.2')
        ->assertOk()
        ->assertJsonPath('hadith_number', '2787.2');
});

it('returns the entry with the lowest id when a number is repeated', function (): void {
    $collection = hadithApiServe(hadithApiCollection('bukhari'));
    $book = hadithApiBook($collection, 1, '1');
    $first = hadithApiEntry($collection, $book, 1, '5', ['text_ar' => HadithEntryFactory::ARABIC_TEXT]);
    hadithApiEntry($collection, $book, 2, '5', ['text_ar' => HadithEntryFactory::LATIN_TEXT]);

    $this->getJson('/api/v1/hadith/collections/bukhari/hadiths/5')
        ->assertOk()
        ->assertJsonPath('text_ar', $first->text_ar);
});

it('returns 404 not_found with the hadith detail in en and ar for an unknown number', function (string $language, string $detail): void {
    hadithApiServe(hadithApiCollection('bukhari'));

    $this->withHeaders(['Accept-Language' => $language])
        ->getJson('/api/v1/hadith/collections/bukhari/hadiths/404')
        ->assertNotFound()
        ->assertJsonPath('code', 'not_found')
        ->assertJsonPath('detail', $detail);
})->with([
    'en' => ['en', 'The hadith was not found.'],
    'ar' => ['ar', 'الحديث غير موجود.'],
]);

it('does not find a hadith through another collection', function (): void {
    $bukhari = hadithApiServe(hadithApiCollection('bukhari'));
    $muslim = hadithApiServe(hadithApiCollection('muslim'));
    $book = hadithApiBook($muslim, 1, '1');
    hadithApiEntry($muslim, $book, 1, '77');

    $this->getJson('/api/v1/hadith/collections/bukhari/hadiths/77')->assertNotFound();
    $this->getJson('/api/v1/hadith/collections/muslim/hadiths/77')->assertOk();
    expect($bukhari->resource_id)->not->toBe($muslim->resource_id);
});

it('returns 404 hadith_collection_unavailable for an unserved collection on the detail route', function (): void {
    hadithApiCollection('bukhari');

    $this->getJson('/api/v1/hadith/collections/bukhari/hadiths/1')
        ->assertNotFound()
        ->assertJsonPath('detail', "This collection isn't available.");
});

it('sends an ETag and answers 304 on the detail route', function (): void {
    $collection = hadithApiServe(hadithApiCollection('bukhari'));
    $book = hadithApiBook($collection, 1, '1');
    hadithApiEntry($collection, $book, 1, '1');

    $etag = $this->getJson('/api/v1/hadith/collections/bukhari/hadiths/1')->assertOk()->headers->get('ETag');

    $this->withHeaders(['If-None-Match' => $etag])
        ->getJson('/api/v1/hadith/collections/bukhari/hadiths/1')
        ->assertStatus(304);
});

it('resolves a merged number to the covering row with its span', function (): void {
    $collection = hadithApiServe(hadithApiCollection('bukhari'));
    $book = hadithApiBook($collection, 1, '1');
    hadithApiEntry($collection, $book, 1, '199', ['number_first' => '199', 'number_last' => '200']);

    $this->getJson('/api/v1/hadith/collections/bukhari/hadiths/200')
        ->assertOk()
        ->assertJsonPath('hadith_number', '199')
        ->assertJsonPath('number_first', '199')
        ->assertJsonPath('number_last', '200')
        ->assertJsonPath('source_code', null);
});

it('prefers an exact hadith number to a span that contains it', function (): void {
    $collection = hadithApiServe(hadithApiCollection('bukhari'));
    $book = hadithApiBook($collection, 1, '1');
    hadithApiEntry($collection, $book, 1, '199', ['number_first' => '199', 'number_last' => '200']);
    hadithApiEntry($collection, $book, 2, '200');

    $this->getJson('/api/v1/hadith/collections/bukhari/hadiths/200')
        ->assertOk()
        ->assertJsonPath('hadith_number', '200')
        ->assertJsonPath('number_first', null);
});

it('still returns 404 for a number that no span covers, and refuses a non-numeric span lookup', function (): void {
    $collection = hadithApiServe(hadithApiCollection('bukhari'));
    $book = hadithApiBook($collection, 1, '1');
    hadithApiEntry($collection, $book, 1, '199', ['number_first' => '199', 'number_last' => '200']);

    $this->getJson('/api/v1/hadith/collections/bukhari/hadiths/201')->assertNotFound();
    $this->getJson('/api/v1/hadith/collections/bukhari/hadiths/abc')->assertNotFound();
});

it('serves a placeholder with empty text and source_code unavailable, in the list and the detail', function (): void {
    $collection = hadithApiServe(hadithApiCollection('bukhari'));
    $book = hadithApiBook($collection, 1, '1');
    hadithApiEntry($collection, $book, 1, '3', [
        'text_ar' => '',
        'text_search' => '',
        'source_code' => 'unavailable',
        'source_key' => 'unavailable:bukhari:3',
        'source_text_sha256' => hash('sha256', ''),
    ]);

    $this->getJson('/api/v1/hadith/collections/bukhari/books/1/hadiths')
        ->assertOk()
        ->assertJsonPath('data.0.hadith_number', '3')
        ->assertJsonPath('data.0.text_ar', '')
        ->assertJsonPath('data.0.source_code', 'unavailable');

    $this->getJson('/api/v1/hadith/collections/bukhari/hadiths/3')
        ->assertOk()
        ->assertJsonPath('text_ar', '')
        ->assertJsonPath('source_code', 'unavailable');
});
