<?php

declare(strict_types=1);

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Jobs\BuildContentPackJob;
use App\Domains\Content\Models\ContentPack;
use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Resource;
use App\Domains\Hadith\Exceptions\HadithImportLockedException;
use App\Domains\Hadith\Exceptions\HadithRangeCorrectionException;
use App\Domains\Hadith\Import\Records\CollectionImportResult;
use App\Domains\Hadith\Import\Records\HadithImportPlan;
use App\Domains\Hadith\Models\HadithBook;
use App\Domains\Hadith\Models\HadithChapter;
use App\Domains\Hadith\Models\HadithCollection;
use App\Domains\Hadith\Models\HadithEntry;
use App\Domains\Hadith\Models\HadithGrade;
use App\Domains\Hadith\Models\HadithRefAlias;
use App\Domains\Hadith\Repositories\Contracts\HadithImportRepository;
use App\Domains\Hadith\Services\HadithImporter;
use App\Domains\Hadith\Sources\SnapshotStore;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

require_once __DIR__.'/../Support/HadithFixtureFiles.php';
require_once __DIR__.'/../Support/HadithImportFixtures.php';

uses(RefreshDatabase::class);

/*
| The importer against MySQL (step 6). Placeholder text only; the fake CDN serves the twelve pinned files from a temporary
| cache, so no test reaches the network.
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
    File::deleteDirectory((string) config('content_sources.cache_root'));
});

const HADITH_IMPORT_ENTRY_TEXT = "نص تجريبي ١ —\u{200F} ليس حديثًا";

function hadithImportResource(string $slug = 'bukhari'): ?Resource
{
    return Resource::query()->where('group', ResourceGroup::HadithCollections->value)->where('source_key', $slug)->first();
}

function hadithImportRowCounts(int $resourceId): array
{
    return [
        'collections' => HadithCollection::query()->where('resource_id', $resourceId)->count(),
        'books' => HadithBook::query()->where('resource_id', $resourceId)->count(),
        'chapters' => HadithChapter::query()->where('resource_id', $resourceId)->count(),
        'entries' => HadithEntry::query()->where('resource_id', $resourceId)->count(),
        'grades' => HadithGrade::query()->where('resource_id', $resourceId)->count(),
        'aliases' => HadithRefAlias::query()->where('resource_id', $resourceId)->count(),
    ];
}

it('imports the default collection into the six tables, with a resource row', function (): void {
    $report = hadithImportRun();
    $result = $report->collections[0];
    $resource = hadithImportResource();

    expect($result->status)->toBe(CollectionImportResult::STATUS_IMPORTED)
        ->and($resource)->not->toBeNull()
        ->and(hadithImportRowCounts($resource->id))->toBe(['collections' => 1, 'books' => 3, 'chapters' => 0, 'entries' => 4, 'grades' => 3, 'aliases' => 0])
        ->and(HadithEntry::query()->where('resource_id', $resource->id)->whereNotNull('chapter_id')->count())->toBe(0);

    $collection = HadithCollection::query()->where('resource_id', $resource->id)->firstOrFail();
    $source = ContentSource::query()->where('code', 'fawazahmed0')->firstOrFail();

    expect((int) $collection->getAttribute('total_hadith'))->toBe(4)
        ->and((int) $collection->getAttribute('books_count'))->toBe(3)
        ->and($collection->getAttribute('attribution_ar'))->toBe($source->attribution_ar)
        ->and($collection->getAttribute('attribution_en'))->toBe($source->attribution_en)
        ->and($resource->version)->toBe(1)
        ->and($resource->changes_floor_version)->toBe(1)
        ->and($resource->checksum)->toBe(config('hadith.files')['editions/ara-bukhari.json'])
        ->and($resource->import_fingerprint)->toBeString()->toHaveLength(64)
        ->and($resource->is_active)->toBeTrue()
        ->and($resource->name)->toBe('صحيح البخاري')
        ->and($resource->name_ar)->toBe('صحيح البخاري');
});

it('stores text_ar byte for byte, with the matching sha256', function (): void {
    hadithImportRun();

    $resource = hadithImportResource();
    $entry = HadithEntry::query()->where('resource_id', $resource->id)->where('source_key', 'fawazahmed0:bukhari:2')->firstOrFail();

    expect($entry->getAttribute('text_ar'))->toBe(HADITH_IMPORT_ENTRY_TEXT)
        ->and(strlen((string) $entry->getAttribute('text_ar')))->toBe(strlen(HADITH_IMPORT_ENTRY_TEXT))
        ->and($entry->getAttribute('source_text_sha256'))->toBe(hash('sha256', HADITH_IMPORT_ENTRY_TEXT));
});

it('uses the numbered fallback name when no approved Arabic title exists', function (): void {
    config(['hadith_titles.collections.bukhari.title_ar' => null]);

    hadithImportRun();

    expect(hadithImportResource()->name)->toBe('مجموعة ١');
});

it('imports all ten collections, with the three renamed source files', function (): void {
    $report = hadithImportRun((array) config('hadith.collections'));

    expect($report->collections)->toHaveCount(10)
        ->and($report->succeeded())->toBeTrue()
        ->and(Resource::query()->where('group', ResourceGroup::HadithCollections->value)->count())->toBe(10)
        ->and(HadithCollection::query()->count())->toBe(10)
        ->and(hadithImportResource('nawawi40'))->not->toBeNull()
        ->and(hadithImportResource('qudsi40'))->not->toBeNull()
        ->and(hadithImportResource('shahwaliullah40'))->not->toBeNull();
});

it('lists no-text hadith in the report and does not import them', function (): void {
    $report = hadithImportRun();

    expect($report->collections[0]->stats->noTextNumbers)->toBe(['3'])
        ->and(HadithEntry::query()->where('source_key', 'fawazahmed0:bukhari:3')->exists())->toBeFalse();
});

it('reports counts against the source and info.json', function (): void {
    $stats = hadithImportRun()->collections[0]->stats;

    expect($stats->hadithInFile)->toBe(5)
        ->and($stats->infoHadithCount)->toBe(5)
        ->and($stats->infoSectionCount)->toBe(4)
        ->and($stats->infoLastHadithNumber)->toBe('2787.2')
        ->and($stats->lastHadithNumberInFile)->toBe('2787.2');
});

it('fails a collection with a duplicate number and writes nothing for it, while the next collection still imports', function (): void {
    hadithImportUse(hadithImportFiles(function (string $path, array $data): array {
        if ($path === 'editions/ara-bukhari.json') {
            $data['hadiths'][] = ['hadithnumber' => 1, 'arabicnumber' => 9, 'text' => 'FIXTURE duplicate', 'grades' => [], 'reference' => ['book' => 1, 'hadith' => 1]];
        }

        return $data;
    }));
    hadithImportWarm();

    $report = hadithImportRun(['bukhari', 'muslim']);

    expect($report->collections[0]->status)->toBe(CollectionImportResult::STATUS_INVALID)
        ->and($report->collections[1]->status)->toBe(CollectionImportResult::STATUS_IMPORTED)
        ->and($report->succeeded())->toBeFalse()
        ->and(hadithImportResource('bukhari'))->toBeNull()
        ->and(hadithImportResource('muslim'))->not->toBeNull();
});

it('fails a collection on a reference.book mismatch unless the developer listed an exception', function (): void {
    $edit = function (string $path, array $data): array {
        if ($path === 'editions/ara-bukhari.json') {
            $data['hadiths'][3]['reference']['book'] = 1;
        }

        return $data;
    };

    hadithImportUse(hadithImportFiles($edit));
    hadithImportWarm();

    $report = hadithImportRun();
    $result = $report->collections[0];

    expect($result->status)->toBe(CollectionImportResult::STATUS_INVALID)
        ->and(collect($result->issues)->pluck('code')->all())->toContain('reference_book_mismatch')
        ->and($result->failure)->toBe('Collection [bukhari]: 1 hadith are in a book that disagrees with reference.book. First numbers: 4.');

    config(['hadith.reference_exceptions' => ['bukhari' => ['4']]]);

    $report = hadithImportRun();

    expect($report->collections[0]->status)->toBe(CollectionImportResult::STATUS_IMPORTED)
        ->and($report->collections[0]->stats->referenceExceptionNumbers)->toBe(['4']);
});

it('dry run writes no rows, no resource and no pack, and reports valid', function (): void {
    $report = hadithImportRun(['bukhari'], true, true, false);

    expect($report->dryRun)->toBeTrue()
        ->and($report->collections[0]->status)->toBe(CollectionImportResult::STATUS_VALID)
        ->and(hadithImportResource())->toBeNull()
        ->and(HadithEntry::query()->count())->toBe(0)
        ->and(ContentPack::query()->count())->toBe(0);
});

it('is idempotent: the same inputs bump nothing and make no request', function (): void {
    hadithImportRun();

    $resource = hadithImportResource();
    $importedAt = HadithEntry::query()->where('resource_id', $resource->id)->value('imported_at');
    $requests = count(Http::recorded());

    $report = hadithImportRun();
    $result = $report->collections[0];

    expect($result->status)->toBe(CollectionImportResult::STATUS_UNCHANGED)
        ->and($result->fingerprintUnchanged)->toBeTrue()
        ->and(hadithImportResource()->version)->toBe(1)
        ->and(HadithEntry::query()->where('resource_id', $resource->id)->value('imported_at'))->toEqual($importedAt)
        ->and(count(Http::recorded()))->toBe($requests);
});

it('bumps the version when titles or reference exceptions change', function (): void {
    hadithImportRun();

    config(['hadith_titles.sections' => ['bukhari' => ['1' => ['title_ar' => 'FIXTURE title', 'title_ar_source' => 'hadithapi.com']]]]);

    $report = hadithImportRun();
    $resource = hadithImportResource();

    expect($report->collections[0]->status)->toBe(CollectionImportResult::STATUS_IMPORTED)
        ->and($resource->version)->toBe(2)
        ->and($resource->changes_floor_version)->toBe(2)
        ->and(HadithBook::query()->where('resource_id', $resource->id)->where('book_number', '1')->value('title_ar'))->toBe('FIXTURE title');

    config(['hadith.reference_exceptions' => ['bukhari' => ['4']]]);

    expect(hadithImportRun()->collections[0]->status)->toBe(CollectionImportResult::STATUS_IMPORTED)
        ->and(hadithImportResource()->version)->toBe(3);
});

it('bumps the version when the edition pin changes', function (): void {
    hadithImportRun();

    $edited = hadithImportFiles(function (string $path, array $data): array {
        if ($path === 'editions/ara-bukhari.json') {
            $data['hadiths'][0]['text'] = 'FIXTURE text 1 — edited';
        }

        return $data;
    });

    hadithImportUse($edited);
    hadithImportWarm();

    expect(hadithImportRun()->collections[0]->status)->toBe(CollectionImportResult::STATUS_IMPORTED)
        ->and(hadithImportResource()->version)->toBe(2);
});

it('rewrites rows when the stored count no longer matches the total', function (): void {
    hadithImportRun();

    $resource = hadithImportResource();
    HadithEntry::query()->where('resource_id', $resource->id)->where('source_key', 'fawazahmed0:bukhari:1')->delete();

    $result = hadithImportRun()->collections[0];

    expect($result->status)->toBe(CollectionImportResult::STATUS_IMPORTED)
        ->and(HadithEntry::query()->where('resource_id', $resource->id)->count())->toBe(4)
        ->and(hadithImportResource()->version)->toBe(2);
});

it('rolls a collection back when a write fails and leaves the version unchanged', function (): void {
    hadithImportBindRepository(fn (HadithImportRepository $inner): HadithImportRepository => new class($inner) implements HadithImportRepository
    {
        public function __construct(private readonly HadithImportRepository $inner) {}

        public function source(string $code): ?ContentSource
        {
            return $this->inner->source($code);
        }

        public function storedCounts(int $resourceId): ?array
        {
            return $this->inner->storedCounts($resourceId);
        }

        public function replaceForResource(int $resourceId, HadithImportPlan $plan): void
        {
            $this->inner->replaceForResource($resourceId, $plan);

            throw new RuntimeException('FIXTURE failure with FIXTURE text 1');
        }

        public function entryTexts(int $resourceId): Generator
        {
            return $this->inner->entryTexts($resourceId);
        }
    });

    $result = hadithImportRun()->collections[0];

    expect($result->status)->toBe(CollectionImportResult::STATUS_FAILED)
        ->and($result->failure)->toBe(RuntimeException::class)
        ->and($result->failed())->toBeTrue()
        ->and(Resource::query()->where('source_key', 'bukhari')->count())->toBe(0)
        ->and(HadithEntry::query()->count())->toBe(0)
        ->and(HadithBook::query()->count())->toBe(0)
        ->and(HadithCollection::query()->count())->toBe(0);
});

it('rolls back when the integrity check fails', function (): void {
    hadithImportBindRepository(fn (HadithImportRepository $inner): HadithImportRepository => new class($inner) implements HadithImportRepository
    {
        public function __construct(private readonly HadithImportRepository $inner) {}

        public function source(string $code): ?ContentSource
        {
            return $this->inner->source($code);
        }

        public function storedCounts(int $resourceId): ?array
        {
            return $this->inner->storedCounts($resourceId);
        }

        public function replaceForResource(int $resourceId, HadithImportPlan $plan): void
        {
            $this->inner->replaceForResource($resourceId, $plan);
        }

        public function entryTexts(int $resourceId): Generator
        {
            $first = true;

            foreach ($this->inner->entryTexts($resourceId) as $row) {
                if ($first) {
                    $row['text_ar'] = 'FIXTURE altered';
                    $first = false;
                }

                yield $row;
            }
        }
    });

    $result = hadithImportRun()->collections[0];

    expect($result->status)->toBe(CollectionImportResult::STATUS_FAILED)
        ->and($result->failure)->toContain('Nothing was written')
        ->and(HadithEntry::query()->count())->toBe(0)
        ->and(HadithCollection::query()->count())->toBe(0);
});

it('detects an altered stored row in verify mode, and verifies an untouched import', function (): void {
    hadithImportRun();

    expect(app(HadithImporter::class)->verify(['bukhari'])->collections[0]->status)->toBe(CollectionImportResult::STATUS_VERIFIED);

    DB::table('hadith_entries')->where('source_key', 'fawazahmed0:bukhari:1')->update(['text_ar' => 'FIXTURE altered']);

    $result = app(HadithImporter::class)->verify(['bukhari'])->collections[0];

    expect($result->status)->toBe(CollectionImportResult::STATUS_INTEGRITY_FAILED)
        ->and($result->integrity->storedHashMismatches)->toBe(1)
        ->and($result->integrity->firstKeys)->toContain('fawazahmed0:bukhari:1');
});

it('refuses a second wet run while the lock is held, allows a dry run, and runs after release', function (): void {
    $lock = Cache::lock(HadithImporter::LOCK_KEY, 10);
    expect($lock->get())->toBeTrue();

    expect(fn () => hadithImportRun())->toThrow(HadithImportLockedException::class, 'Another Hadith import is already running.');
    expect(hadithImportRun(['bukhari'], true)->collections[0]->status)->toBe(CollectionImportResult::STATUS_VALID);

    $lock->release();

    expect(hadithImportRun()->collections[0]->status)->toBe(CollectionImportResult::STATUS_IMPORTED);
});

it('makes no request without a cached snapshot and reports no_snapshot', function (): void {
    File::deleteDirectory(app(SnapshotStore::class)->directory());
    $requests = count(Http::recorded());

    $report = hadithImportRun();

    expect($report->collections[0]->status)->toBe(CollectionImportResult::STATUS_NO_SNAPSHOT)
        ->and($report->succeeded())->toBeTrue()
        ->and(count(Http::recorded()))->toBe($requests)
        ->and(HadithEntry::query()->count())->toBe(0);
});

it('reports no_snapshot when a cached file is corrupt', function (): void {
    File::put(app(SnapshotStore::class)->path('info.json'), 'FIXTURE corrupt bytes');

    expect(hadithImportRun()->collections[0]->status)->toBe(CollectionImportResult::STATUS_NO_SNAPSHOT);
});

it('builds the pack now with --build-packs, without grade rows (grades are hidden)', function (): void {
    $report = hadithImportRun(['bukhari'], false, true, false);
    $result = $report->collections[0];

    expect($result->pack['built'])->toBeTrue()
        ->and($result->pack['row_count'])->toBeGreaterThan(0)
        ->and(ContentPack::query()->where('resource_id', $result->resourceId)->exists())->toBeTrue();

    $pack = hadithImportPack($result->resourceId);

    expect(count($pack['tables']['hadith_entries']))->toBe(4)
        ->and(count($pack['tables']['hadith_grades']))->toBe(0)
        ->and(count($pack['tables']['hadith_chapters']))->toBe(0);
});

it('queues the pack job by default, once, and not again when unchanged', function (): void {
    Queue::fake();

    hadithImportRun(['bukhari'], false, false, false);

    Queue::assertPushed(BuildContentPackJob::class, 1);

    hadithImportRun(['bukhari'], false, false, false);

    Queue::assertPushed(BuildContentPackJob::class, 1);
});

it('queues nothing with --defer-pack', function (): void {
    Queue::fake();

    $result = hadithImportRun()->collections[0];

    Queue::assertNothingPushed();
    expect($result->pack['deferred'])->toBeTrue();
});

it('refuses --build-packs together with --defer-pack', function (): void {
    expect(fn () => hadithImportRun(['bukhari'], false, true, true))->toThrow(LogicException::class);
});

it('never puts text, titles or section names in the report', function (): void {
    $json = json_encode(hadithImportRun()->toReport(), JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);

    expect($json)->not->toContain('FIXTURE text')
        ->and($json)->not->toContain('FIXTURE section')
        ->and($json)->not->toContain('نص تجريبي');
});

it('leaves hadith_chapters empty when there is no chapter file', function (): void {
    hadithImportRun((array) config('hadith.collections'));

    expect(HadithChapter::query()->count())->toBe(0)
        ->and(HadithEntry::query()->whereNotNull('chapter_id')->count())->toBe(0);
});

it('does not mention hadith in release.sh or start-web.sh', function (): void {
    expect(file_get_contents(base_path('docker/release.sh')))->not->toContain('hadith:')
        ->and(file_get_contents(base_path('docker/start-web.sh')))->not->toContain('hadith:');
});

it('skips a text-bearing hadith outside every range and lists it, without failing', function (): void {
    hadithImportUse(hadithImportFiles(function (string $path, array $data): array {
        if ($path === 'editions/ara-bukhari.json') {
            $data['hadiths'][] = ['hadithnumber' => 500, 'arabicnumber' => 500, 'text' => 'FIXTURE outside', 'grades' => [], 'reference' => ['book' => 1, 'hadith' => 500]];
        }

        return $data;
    }));
    hadithImportWarm();

    $result = hadithImportRun()->collections[0];

    expect($result->status)->toBe(CollectionImportResult::STATUS_HELD_BACK)
        ->and($result->stats->outsideRanges)->toBe(['500'])
        ->and($result->stats->incompleteReasons)->toBe(['500' => 'outside_range'])
        ->and(HadithEntry::query()->where('source_key', 'fawazahmed0:bukhari:500')->exists())->toBeFalse();
});

it('counts reference.book 0 as missing and imports the collection', function (): void {
    hadithImportUse(hadithImportFiles(function (string $path, array $data): array {
        if ($path === 'editions/ara-bukhari.json') {
            $data['hadiths'][3]['reference']['book'] = 0;
        }

        return $data;
    }));
    hadithImportWarm();

    $result = hadithImportRun()->collections[0];

    expect($result->status)->toBe(CollectionImportResult::STATUS_IMPORTED)
        ->and($result->stats->referenceMissing)->toBe(1)
        ->and($result->stats->referenceMismatchNumbers)->toBe([]);
});

it('bumps the version when a range correction changes, and fails an unknown correction before any work', function (): void {
    config(['hadith.range_corrections' => ['muslim' => []]]);
    expect(hadithImportRun(['muslim'])->collections[0]->status)->toBe(CollectionImportResult::STATUS_IMPORTED);

    config(['hadith.range_corrections' => ['muslim' => ['1' => ['first' => '1', 'last' => '2']]]]);
    expect(hadithImportRun(['muslim'])->collections[0]->status)->toBe(CollectionImportResult::STATUS_IMPORTED);

    config(['hadith.range_corrections' => ['nope' => ['1' => ['first' => '1', 'last' => '2']]]]);
    expect(fn () => hadithImportRun(['muslim']))->toThrow(HadithRangeCorrectionException::class);
});
