<?php

declare(strict_types=1);

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Resource;
use App\Domains\Hadith\Import\Records\CollectionImportResult;
use App\Domains\Hadith\Models\HadithChapter;
use App\Domains\Hadith\Models\HadithEntry;
use App\Domains\Hadith\Overlay\HadithDataFiles;
use App\Domains\Hadith\Services\HadithChapterAssigner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

require_once __DIR__.'/../Support/HadithFixtureFiles.php';
require_once __DIR__.'/../Support/HadithImportFixtures.php';

uses(RefreshDatabase::class);

/*
| OpenITI chapters (ADR 0076 §2 and §7, step 6b.5). The default fixture collection has hadith 1 and 2 in book 1, hadith 3 (no
| text, approved as a completeness exception) and 4 in book 2, and 2787.2 in book 3. Placeholder titles only.
*/

beforeEach(function (): void {
    Http::preventStrayRequests();
    Storage::fake('local');
    config(['hadith.range_corrections' => []]);
    hadithImportApproveFixtureGaps((array) config('hadith.collections'));
    hadithImportUse(hadithImportFiles());
    hadithImportWarm();
});

afterEach(function (): void {
    File::deleteDirectory(storage_path('framework/testing/hadith-gaps-'.getmypid()));
    File::deleteDirectory((string) config('content_sources.cache_root'));
});

/**
 * @return array<string, mixed>
 */
function hadithChaptersRecord(int $ordinal, string $book, string $first, string $last, string $title = 'FIXTURE chapter title 1'): array
{
    return ['ordinal' => $ordinal, 'book_number' => $book, 'first' => $first, 'last' => $last, 'title_ar' => $title];
}

function hadithChaptersResourceId(string $slug = 'bukhari'): int
{
    return (int) Resource::query()->where('group', ResourceGroup::HadithCollections->value)->where('source_key', $slug)->value('id');
}

function hadithChaptersRun(): CollectionImportResult
{
    return hadithImportRun(['bukhari'], false, false, true)->collections[0];
}

it('imports a collection with no chapter file exactly as before', function (): void {
    $result = hadithChaptersRun();

    expect($result->status)->toBe(CollectionImportResult::STATUS_IMPORTED)
        ->and(HadithChapter::query()->count())->toBe(0)
        ->and(HadithEntry::query()->whereNotNull('chapter_id')->count())->toBe(0);
});

it('writes chapter rows with source_id openiti and the key and ordinals of the file', function (): void {
    hadithChaptersFixtureFile('bukhari', [hadithChaptersRecord(1, '1', '1', '2'), hadithChaptersRecord(1, '2', '4', '4')]);

    expect(hadithChaptersRun()->status)->toBe(CollectionImportResult::STATUS_IMPORTED);

    $openiti = ContentSource::query()->where('code', 'openiti')->value('id');
    $chapters = HadithChapter::query()->where('resource_id', hadithChaptersResourceId())->orderBy('id')->get();

    expect($chapters)->toHaveCount(2)
        ->and($chapters[0]->source_id)->toBe($openiti)
        ->and($chapters[0]->source_key)->toBe('openiti:bukhari:1:1')
        ->and($chapters[0]->source_chapter_key)->toBe('1')
        ->and($chapters[0]->chapter_number)->toBe(1)
        ->and($chapters[1]->source_key)->toBe('openiti:bukhari:2:1')
        ->and($chapters[1]->chapter_number)->toBe(1);
});

it('sets chapter_id for every hadith in a chapter and null elsewhere, and hadith_count to the number of entries', function (): void {
    hadithChaptersFixtureFile('bukhari', [hadithChaptersRecord(1, '1', '1', '2')]);

    hadithChaptersRun();
    $resourceId = hadithChaptersResourceId();
    $chapterId = HadithChapter::query()->where('resource_id', $resourceId)->value('id');

    expect(HadithEntry::query()->where('resource_id', $resourceId)->where('hadith_number', '1')->value('chapter_id'))->toBe($chapterId)
        ->and(HadithEntry::query()->where('resource_id', $resourceId)->where('hadith_number', '2')->value('chapter_id'))->toBe($chapterId)
        ->and(HadithEntry::query()->where('resource_id', $resourceId)->where('hadith_number', '4')->value('chapter_id'))->toBeNull()
        ->and(HadithChapter::query()->where('resource_id', $resourceId)->value('hadith_count'))->toBe(2);
});

it('titles round trip byte for byte, with a bidi mark, a double space and Arabic digits', function (): void {
    $title = "FIXTURE chapter \u{200F}title ٣  ١ — inside";
    hadithChaptersFixtureFile('bukhari', [hadithChaptersRecord(1, '1', '1', '2', $title)]);

    hadithChaptersRun();
    $resourceId = hadithChaptersResourceId();
    $stored = HadithChapter::query()->where('resource_id', $resourceId)->value('title_ar');
    $packed = hadithImportPack($resourceId)['tables']['hadith_chapters'][0]['title_ar'];

    expect($stored)->toBe($title)
        ->and($packed)->toBe($title);
});

it('keeps the hadith rows on the primary source', function (): void {
    hadithChaptersFixtureFile('bukhari', [hadithChaptersRecord(1, '1', '1', '2')]);

    hadithChaptersRun();
    $row = HadithEntry::query()->where('resource_id', hadithChaptersResourceId())->where('hadith_number', '1')->first();
    $primary = ContentSource::query()->where('code', 'fawazahmed0')->value('id');

    expect($row?->source_id)->toBe($primary)
        ->and($row?->source_key)->toBe('fawazahmed0:bukhari:1')
        ->and($row?->text_ar)->toBe('FIXTURE text 1 — not a hadith')
        ->and($row?->source_text_sha256)->toBe(hash('sha256', 'FIXTURE text 1 — not a hadith'));
});

it('includes filled rows and merge-covering rows between the bounds', function (): void {
    // Hadith 3 has no text: filled here. Hadith 4 covers 3 by a merge in a second import below.
    hadithGapsFixtureFile('bukhari', fills: [['number' => '3', 'origin' => 'openiti', 'source_key' => 'openiti:bukhari:3', 'unit' => 1, 'text_ar' => 'FIXTURE text 3 — not a hadith', 'source_text_sha256' => hash('sha256', 'FIXTURE text 3 — not a hadith')]]);
    hadithChaptersFixtureFile('bukhari', [hadithChaptersRecord(1, '2', '3', '4')]);

    $result = hadithChaptersRun();
    $chapterId = HadithChapter::query()->where('resource_id', hadithChaptersResourceId())->value('id');

    expect($result->status)->toBe(CollectionImportResult::STATUS_IMPORTED)
        ->and(HadithEntry::query()->where('resource_id', hadithChaptersResourceId())->where('hadith_number', '3')->value('chapter_id'))->toBe($chapterId)
        ->and(HadithEntry::query()->where('resource_id', hadithChaptersResourceId())->where('hadith_number', '4')->value('chapter_id'))->toBe($chapterId);
});

it('covers a merge-covering row by its own bounds', function (): void {
    config(['hadith.completeness_exceptions' => []]);
    hadithGapsFixtureFile('bukhari', merges: [['number' => '3', 'into' => '4', 'origin' => 'openiti']]);
    hadithChaptersFixtureFile('bukhari', [hadithChaptersRecord(1, '2', '4', '4')]);

    $result = hadithChaptersRun();
    $row = HadithEntry::query()->where('resource_id', hadithChaptersResourceId())->where('hadith_number', '4')->first();

    expect($result->status)->toBe(CollectionImportResult::STATUS_IMPORTED)
        ->and($row?->number_first)->toBe('3')
        ->and($row?->chapter_id)->not->toBeNull();
});

it('fails a chapter that names an unknown book', function (): void {
    hadithChaptersFixtureFile('bukhari', [hadithChaptersRecord(1, '9', '1', '2')]);

    $result = hadithChaptersRun();

    expect($result->status)->toBe(CollectionImportResult::STATUS_FAILED)
        ->and($result->failure)->toContain('chapter_book_unknown');
});

it('refuses a bound that is not in the book', function (): void {
    // Hadith 4 belongs to book 2, not book 1.
    hadithChaptersFixtureFile('bukhari', [hadithChaptersRecord(1, '1', '1', '4')]);

    expect(hadithChaptersRun()->status)->toBe(CollectionImportResult::STATUS_INVALID);
});

it('refuses an inverted range', function (): void {
    hadithChaptersFixtureFile('bukhari', [hadithChaptersRecord(1, '1', '2', '1')]);

    expect(hadithChaptersRun()->status)->toBe(CollectionImportResult::STATUS_INVALID);
});

it('refuses two overlapping chapters', function (): void {
    hadithChaptersFixtureFile('bukhari', [hadithChaptersRecord(1, '1', '1', '2'), hadithChaptersRecord(2, '1', '2', '2')]);

    expect(hadithChaptersRun()->status)->toBe(CollectionImportResult::STATUS_INVALID);
});

it('refuses a drop file with a half-covered book, and passes a keep file with one', function (): void {
    hadithChaptersFixtureFile('bukhari', [hadithChaptersRecord(1, '1', '1', '1')], ['partial_books' => 'drop']);

    expect(hadithChaptersRun()->status)->toBe(CollectionImportResult::STATUS_INVALID);

    hadithChaptersFixtureFile('bukhari', [hadithChaptersRecord(1, '1', '1', '1')], ['partial_books' => 'keep']);

    expect(hadithChaptersRun()->status)->toBe(CollectionImportResult::STATUS_IMPORTED);
});

it('refuses a file with a text field (unknown_key)', function (): void {
    $chapter = hadithChaptersRecord(1, '1', '1', '2');
    $chapter['text_ar'] = 'FIXTURE text 1 — not a hadith';
    hadithChaptersFixtureFile('bukhari', [$chapter]);

    $result = hadithChaptersRun();

    expect($result->status)->toBe(CollectionImportResult::STATUS_FAILED)
        ->and($result->failure)->toContain('unknown_key');
});

it('refuses a wrong SHA-256 and a pin with no file', function (): void {
    hadithChaptersFixtureFile('bukhari', [hadithChaptersRecord(1, '1', '1', '2')]);
    config(['hadith.data_files' => ['chapters/bukhari.json' => str_repeat('0', 64)]]);

    expect(hadithChaptersRun()->failure)->toContain('sha_mismatch');

    config(['hadith.data_files' => ['chapters/bukhari.json' => str_repeat('0', 64)]]);
    app()->instance(HadithDataFiles::class, new HadithDataFiles(storage_path('framework/testing/hadith-chapters-missing')));

    expect(hadithChaptersRun()->failure)->toContain('file_missing');
});

it('returns the mapping unchanged when there is no chapter file', function (): void {
    $mapping = hadithImportMap(hadithImportRecord([hadithImportHadith('1', 'FIXTURE text 1 — not a hadith', '1')]));

    expect(app(HadithChapterAssigner::class)->assign($mapping, null, 1, 'bukhari'))->toBe($mapping);
});

it('re-import with the same pins is idempotent and a changed chapter file bumps the version', function (): void {
    hadithChaptersFixtureFile('bukhari', [hadithChaptersRecord(1, '1', '1', '2')]);
    $first = hadithChaptersRun();

    hadithChaptersFixtureFile('bukhari', [hadithChaptersRecord(1, '1', '1', '2')]);
    $same = hadithChaptersRun();

    hadithChaptersFixtureFile('bukhari', [hadithChaptersRecord(1, '1', '1', '2', 'FIXTURE chapter title changed')]);
    $changed = hadithChaptersRun();

    expect($first->status)->toBe(CollectionImportResult::STATUS_IMPORTED)
        ->and($same->status)->toBe(CollectionImportResult::STATUS_UNCHANGED)
        ->and($changed->versionAfter)->toBeGreaterThan($changed->versionBefore);
});

it('pack contains hadith_chapters rows only for chaptered collections', function (): void {
    hadithChaptersFixtureFile('bukhari', [hadithChaptersRecord(1, '1', '1', '2')]);
    hadithImportRun(['bukhari', 'muslim'], false, false, true);

    $bukhari = hadithImportPack(hadithChaptersResourceId('bukhari'))['tables']['hadith_chapters'];
    $muslim = hadithImportPack(hadithChaptersResourceId('muslim'))['tables']['hadith_chapters'];

    expect($bukhari)->toHaveCount(1)
        ->and($muslim)->toBe([]);
});

it('a held-back collection still imports its chapters', function (): void {
    config(['hadith.completeness_exceptions' => []]);
    hadithChaptersFixtureFile('bukhari', [hadithChaptersRecord(1, '1', '1', '2')]);

    $result = hadithChaptersRun();

    expect($result->status)->toBe(CollectionImportResult::STATUS_HELD_BACK)
        ->and(HadithChapter::query()->where('resource_id', hadithChaptersResourceId())->count())->toBe(1);
});
