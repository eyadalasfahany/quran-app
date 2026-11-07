<?php

declare(strict_types=1);

use App\Domains\Content\Enums\ChangeOperation;
use App\Domains\Content\Enums\PermissionStatus;
use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Enums\TextDirection;
use App\Domains\Content\Events\ResourceContentChanged;
use App\Domains\Content\Jobs\PruneContentChangesJob;
use App\Domains\Content\Models\ContentChange;
use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Recitation;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Packs\ChangeCursor;
use App\Domains\Content\Packs\PackBuilder;
use App\Domains\Content\Services\Mp3QuranImporter;
use App\Domains\Hadith\Models\HadithCollection;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

require_once __DIR__.'/../../Support/Mp3QuranTestManifest.php';

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Http::preventStrayRequests();
    Storage::fake('local');
    $this->withHeaders([
        'Accept' => 'application/json',
        'Accept-Language' => 'en',
    ]);
});

it('returns the manifest for active resources that have a pack', function (): void {
    $tafsir = Resource::factory()->create([
        'group' => ResourceGroup::Tafsirs,
        'name' => 'Jalalayn',
        'author_name' => 'Al-Mahalli',
        'language_code' => 'ar',
        'direction' => TextDirection::Rtl,
        'version' => 4,
        'changes_floor_version' => 2,
        'is_active' => true,
    ]);
    $older = Resource::factory()->create([
        'group' => ResourceGroup::Tafsirs,
        'name' => 'Haleem',
        'author_name' => 'Abdul Haleem',
        'language_code' => 'ar',
        'direction' => TextDirection::Ltr,
        'version' => 2,
        'changes_floor_version' => 1,
        'is_active' => true,
    ]);
    $later = Resource::factory()->create([
        'group' => ResourceGroup::Tafsirs,
        'name' => 'Bridges',
        'author_name' => null,
        'language_code' => 'ar',
        'direction' => TextDirection::Ltr,
        'version' => 8,
        'changes_floor_version' => 8,
        'is_active' => true,
    ]);
    $inactive = Resource::factory()->create([
        'group' => ResourceGroup::Tafsirs,
        'version' => 1,
        'is_active' => false,
    ]);
    $unpacked = Resource::factory()->create([
        'group' => ResourceGroup::Mushafs,
        'version' => 1,
        'is_active' => true,
    ]);

    Carbon::setTestNow('2026-10-27 01:00:00');
    app(PackBuilder::class)->build($tafsir);
    Carbon::setTestNow('2026-10-27 02:00:00');
    $olderPack = app(PackBuilder::class)->build($older);
    $older->version = 9;
    $older->save();
    Carbon::setTestNow('2026-10-27 03:00:00');
    app(PackBuilder::class)->build($later);
    app(PackBuilder::class)->build($inactive);
    Carbon::setTestNow();

    $response = $this->getJson('/api/v1/content/manifest');

    $response->assertOk()
        ->assertHeader('Cache-Control', 'max-age=300, public')
        ->assertJsonPath('pack_schema_version', 1)
        ->assertJsonPath('generated_at', '2026-10-27T03:00:00.000Z')
        ->assertJsonCount(3, 'resources')
        ->assertJsonPath('resources.0.id', $tafsir->id)
        ->assertJsonPath('resources.0.group', 'tafsirs')
        ->assertJsonPath('resources.0.name', 'Jalalayn')
        ->assertJsonPath('resources.0.author_name', 'Al-Mahalli')
        ->assertJsonPath('resources.0.language_code', 'ar')
        ->assertJsonPath('resources.0.direction', 'rtl')
        ->assertJsonPath('resources.0.version', 4)
        ->assertJsonPath('resources.0.changes_since_min_version', 2)
        ->assertJsonPath('resources.0.pack.url', '/api/v1/content/packs/'.$tafsir->id.'/4')
        ->assertJsonPath('resources.1.id', $older->id)
        ->assertJsonPath('resources.1.version', 2)
        ->assertJsonPath('resources.1.pack.sha256', $olderPack->sha256)
        ->assertJsonPath('resources.1.pack.size_bytes', $olderPack->sizeBytes)
        ->assertJsonPath('resources.2.id', $later->id)
        ->assertJsonPath('resources.2.group', 'tafsirs');

    $ids = collect($response->json('resources'))->pluck('id')->all();
    expect($ids)->not->toContain($inactive->id)
        ->and($ids)->not->toContain($unpacked->id);

    $etag = $response->headers->get('ETag');
    expect($etag)->toBe('"'.hash('sha256', $response->getContent()).'"');

    $this->getJson('/api/v1/content/manifest')
        ->assertOk()
        ->assertHeader('ETag', $etag);

    $this->withHeaders(['If-None-Match' => $etag])
        ->get('/api/v1/content/manifest')
        ->assertStatus(304)
        ->assertHeader('ETag', $etag)
        ->assertHeader('Cache-Control', 'max-age=300, public');

    expect($this->withHeaders(['If-None-Match' => $etag])->get('/api/v1/content/manifest')->getContent())->toBe('');
});

it('uses a stable epoch timestamp when no pack has been built', function (): void {
    $this->getJson('/api/v1/content/manifest')
        ->assertOk()
        ->assertJsonPath('generated_at', '1970-01-01T00:00:00.000Z')
        ->assertJsonPath('resources', []);
});

it('omits a resource from the manifest when its pack file is missing on disk', function (): void {
    $resource = Resource::factory()->create([
        'group' => ResourceGroup::Tafsirs,
        'version' => 2,
        'is_active' => true,
    ]);
    $pack = app(PackBuilder::class)->build($resource);
    Storage::disk('local')->delete($pack->path);

    $this->getJson('/api/v1/content/manifest')
        ->assertOk()
        ->assertJsonPath('resources', []);
});

it('streams a pack and rejects an unknown or inactive one', function (): void {
    $resource = Resource::factory()->create([
        'group' => ResourceGroup::Tafsirs,
        'version' => 2,
        'is_active' => true,
    ]);
    $pack = app(PackBuilder::class)->build($resource);
    $bytes = Storage::disk('local')->get($pack->path);
    expect($bytes)->toBeString();

    $download = $this->get('/api/v1/content/packs/'.$resource->id.'/2');

    $download->assertOk()
        ->assertHeader('Content-Type', 'application/gzip')
        ->assertHeader('Content-Length', (string) strlen($bytes))
        ->assertHeader('Cache-Control', 'immutable, max-age=31536000, public')
        ->assertHeader('ETag', '"'.$pack->sha256.'"');

    expect($download->baseResponse)->toBeInstanceOf(BinaryFileResponse::class);

    $file = $download->baseResponse->getFile();
    expect($file)->not->toBeNull();
    expect(file_get_contents($file->getPathname()))->toBe($bytes);

    $this->getJson('/api/v1/content/packs/'.$resource->id.'/9')
        ->assertNotFound()
        ->assertHeader('Content-Type', 'application/problem+json')
        ->assertJsonPath('status', 404)
        ->assertJsonPath('code', 'not_found')
        ->assertJsonPath('detail', 'The content pack was not found.');

    $this->getJson('/api/v1/content/packs/999999/1')
        ->assertNotFound()
        ->assertJsonPath('code', 'not_found');

    $resource->is_active = false;
    $resource->save();

    $this->getJson('/api/v1/content/packs/'.$resource->id.'/2')
        ->assertNotFound()
        ->assertJsonPath('detail', 'The content pack was not found.');
});

it('pages changes newer than since_version', function (): void {
    $resource = Resource::factory()->create([
        'version' => 2,
        'changes_floor_version' => 0,
        'is_active' => true,
    ]);

    $stale = contentChange($resource->id, 1, 1);
    $kept = [];

    for ($verse = 2; $verse <= 6; $verse++) {
        $kept[] = contentChange($resource->id, 2, $verse);
    }

    $first = $this->getJson('/api/v1/content/changes?resource_id='.$resource->id.'&since_version=1&limit=2');

    $first->assertOk()
        ->assertHeader('Cache-Control', 'max-age=60, public')
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.id', $kept[0]->id)
        ->assertJsonPath('data.0.version', 2)
        ->assertJsonPath('data.0.entity', 'tafsir_entry')
        ->assertJsonPath('data.0.entity_key', '2')
        ->assertJsonPath('data.0.op', 'upsert')
        ->assertJsonPath('data.0.payload.html', 'ayah 2')
        ->assertJsonPath('data.1.id', $kept[1]->id)
        ->assertJsonPath('next_cursor', ChangeCursor::encode($kept[1]->id));

    $ids = collect($first->json('data'))->pluck('id');
    expect($ids)->not->toContain($stale->id);

    $second = $this->getJson('/api/v1/content/changes?resource_id='.$resource->id.'&since_version=1&limit=2&cursor='.$first->json('next_cursor'));
    $second->assertOk()
        ->assertJsonPath('data.0.id', $kept[2]->id)
        ->assertJsonPath('data.1.id', $kept[3]->id)
        ->assertJsonPath('next_cursor', ChangeCursor::encode($kept[3]->id));

    $third = $this->getJson('/api/v1/content/changes?resource_id='.$resource->id.'&since_version=1&limit=2&cursor='.$second->json('next_cursor'));
    $third->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $kept[4]->id)
        ->assertJsonPath('next_cursor', null);

    $this->getJson('/api/v1/content/changes?resource_id='.$resource->id.'&since_version=2')
        ->assertOk()
        ->assertJsonPath('data', [])
        ->assertJsonPath('next_cursor', null);
});

it('returns 410 when the requested version is below the floor or a later change was pruned', function (): void {
    $floored = Resource::factory()->create([
        'version' => 5,
        'changes_floor_version' => 4,
        'is_active' => true,
    ]);

    $this->getJson('/api/v1/content/changes?resource_id='.$floored->id.'&since_version=3')
        ->assertStatus(410)
        ->assertHeader('Content-Type', 'application/problem+json')
        ->assertJsonPath('status', 410)
        ->assertJsonPath('code', 'changes_gone')
        ->assertJsonPath('title', 'Gone')
        ->assertJsonPath('detail', 'The change feed no longer covers this version. Download the pack.');

    $gapped = Resource::factory()->create([
        'version' => 5,
        'changes_floor_version' => 0,
        'is_active' => true,
    ]);
    contentChange($gapped->id, 4, 1);

    $this->getJson('/api/v1/content/changes?resource_id='.$gapped->id.'&since_version=2')
        ->assertStatus(410)
        ->assertJsonPath('code', 'changes_gone');
});

it('rejects a bad cursor or a missing resource', function (): void {
    $resource = Resource::factory()->create(['is_active' => true]);
    $inactive = Resource::factory()->create(['is_active' => false]);

    $this->getJson('/api/v1/content/changes')
        ->assertUnprocessable()
        ->assertJsonPath('code', 'validation_failed')
        ->assertJsonPath('errors.resource_id.0', 'The resource id field is required.')
        ->assertJsonPath('errors.since_version.0', 'The since version field is required.');

    $this->getJson('/api/v1/content/changes?resource_id='.$resource->id.'&since_version=0&cursor=not-a-cursor')
        ->assertUnprocessable()
        ->assertJsonPath('errors.cursor.0', 'The cursor is invalid.');

    $this->getJson('/api/v1/content/changes?resource_id='.$inactive->id.'&since_version=0')
        ->assertUnprocessable()
        ->assertJsonPath('errors.resource_id.0', 'The selected resource id is invalid.');

    $this->getJson('/api/v1/content/changes?resource_id=999999&since_version=0')
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['resource_id']);
});

it('returns 429 after the configured content rate limit', function (): void {
    config(['content.rate_limit_per_minute' => 2]);

    $headers = ['REMOTE_ADDR' => '203.0.113.50'];

    $this->withServerVariables($headers)->getJson('/api/v1/content/manifest')->assertOk();
    $this->withServerVariables($headers)->getJson('/api/v1/content/manifest')->assertOk();
    $this->withServerVariables($headers)->getJson('/api/v1/content/manifest')
        ->assertStatus(429)
        ->assertHeader('Content-Type', 'application/problem+json')
        ->assertHeader('Retry-After')
        ->assertJsonPath('status', 429)
        ->assertJsonPath('code', 'too_many_requests');
});

it('deletes only content changes older than the retention window', function (): void {
    $resource = Resource::factory()->create();
    $old = contentChange($resource->id, 1, 1);
    $boundary = contentChange($resource->id, 1, 2);
    $recent = contentChange($resource->id, 1, 3);

    ContentChange::query()->whereKey($old->id)->update(['created_at' => '2026-09-27 11:59:59']);
    ContentChange::query()->whereKey($boundary->id)->update(['created_at' => '2026-09-27 12:00:00']);
    ContentChange::query()->whereKey($recent->id)->update(['created_at' => '2026-10-01 00:00:00']);

    Carbon::setTestNow('2026-10-27 12:00:00');

    try {
        dispatch(new PruneContentChangesJob);
    } finally {
        Carbon::setTestNow();
    }

    expect(ContentChange::query()->pluck('id')->all())->toEqualCanonicalizing([$boundary->id, $recent->id]);
});

it('prunes content changes daily at midnight UTC', function (): void {
    $events = collect(app(Schedule::class)->events())
        ->filter(fn (object $event): bool => ($event->description ?? null) === PruneContentChangesJob::class);

    expect($events)->toHaveCount(1);
    expect($events->every(fn (object $event): bool => $event->expression === '0 0 * * *' && $event->timezone === 'UTC'))->toBeTrue();
});

it('lists no resource in an ignored group even when it is active and packed', function (string $group): void {
    $ignored = Resource::factory()->create([
        'group' => $group,
        'version' => 1,
        'is_active' => true,
    ]);
    app(PackBuilder::class)->build($ignored);

    $tafsir = Resource::factory()->create([
        'group' => ResourceGroup::Tafsirs,
        'version' => 1,
        'is_active' => true,
    ]);
    app(PackBuilder::class)->build($tafsir);

    $response = $this->getJson('/api/v1/content/manifest')->assertOk();
    $ids = collect($response->json('resources'))->pluck('id')->all();

    expect($ids)->toContain($tafsir->id)
        ->and($ids)->not->toContain($ignored->id);
})->with(ResourceGroup::ignoredValues());

it('returns 404 for the pack and the change feed of an ignored resource even when it is active', function (string $group): void {
    $ignored = Resource::factory()->create([
        'group' => $group,
        'version' => 2,
        'changes_floor_version' => 0,
        'is_active' => true,
    ]);
    app(PackBuilder::class)->build($ignored);
    contentChange($ignored->id, 2, 1);

    $this->getJson('/api/v1/content/packs/'.$ignored->id.'/2')
        ->assertNotFound()
        ->assertHeader('Content-Type', 'application/problem+json')
        ->assertJsonPath('code', 'not_found')
        ->assertJsonPath('detail', 'The content pack was not found.');

    $this->getJson('/api/v1/content/changes?resource_id='.$ignored->id.'&since_version=1')
        ->assertNotFound()
        ->assertJsonPath('code', 'not_found');
})->with(ResourceGroup::ignoredValues());

function hadithCollectionResource(string $slug): Resource
{
    $collection = HadithCollection::factory()->create(['slug' => $slug]);

    return Resource::query()->findOrFail($collection->resource_id);
}

function packedRecitation(string $sourceKey, ?string $reciterNameAr, ?string $nameAr = null, ?string $style = 'Murattal'): Resource
{
    $qf = ContentSource::query()->firstOrCreate(['code' => 'qf'], [
        'name' => 'Quran Foundation',
        'licence_url' => 'https://api-docs.quran.foundation/legal/developer-terms/',
        'attribution_ar' => 'محتوى القرآن من مؤسسة القرآن (quran.foundation)',
        'attribution_en' => 'Quran Foundation (quran.foundation)',
        'permission_status' => PermissionStatus::Granted,
    ]);
    $recitation = Recitation::factory()->create([
        'reciter_name_ar' => $reciterNameAr,
        'style' => $style,
        'resource_id' => Resource::factory()->state([
            'source_id' => $qf->id,
            'group' => ResourceGroup::ChapterRecitations,
            'source_key' => $sourceKey,
            'name_ar' => $nameAr,
            'version' => 1,
            'is_active' => true,
        ]),
    ]);
    $resource = $recitation->resource;
    app(PackBuilder::class)->build($resource);

    return $resource;
}

/**
 * @param  list<array{query: string, bindings: list<mixed>, time: float|null}>  $log
 */
function recitationQueries(array $log): int
{
    return count(array_filter(
        $log,
        fn (array $query): bool => str_contains($query['query'], '`recitations`'),
    ));
}

function contentChange(int $resourceId, int $version, int $verseId): ContentChange
{
    return ContentChange::query()->create([
        'resource_id' => $resourceId,
        'version' => $version,
        'entity' => 'tafsir_entry',
        'entity_key' => (string) $verseId,
        'op' => ChangeOperation::Upsert,
        'payload' => [
            'resource_id' => $resourceId,
            'group_tafsir_id' => $verseId,
            'first_verse_id' => $verseId,
            'last_verse_id' => $verseId,
            'html' => 'ayah '.$verseId,
        ],
    ]);
}

it('lists and serves only Arabic tafsirs', function (): void {
    $arabic = Resource::factory()->create([
        'group' => ResourceGroup::Tafsirs,
        'language_code' => 'ar',
        'version' => 1,
        'is_active' => true,
    ]);
    $english = Resource::factory()->create([
        'group' => ResourceGroup::Tafsirs,
        'language_code' => 'en',
        'version' => 1,
        'is_active' => true,
    ]);
    app(PackBuilder::class)->build($arabic);
    app(PackBuilder::class)->build($english);

    $response = $this->getJson('/api/v1/content/manifest');

    expect(collect($response->json('resources'))->pluck('id')->all())->toBe([$arabic->id])
        ->and($this->getJson('/api/v1/content/packs/'.$english->id.'/'.$english->version)->status())->toBe(404)
        ->and($this->getJson('/api/v1/content/changes?resource_id='.$arabic->id.'&since_version=1')->status())->toBe(200)
        ->and($this->getJson('/api/v1/content/changes?resource_id='.$english->id.'&since_version=1')->status())->toBe(404);
});

it('serves the configured Arabic name for a QF id and the catalogue name otherwise', function (): void {
    $overridden = Resource::factory()->create([
        'group' => ResourceGroup::Tafsirs,
        'source_key' => '14',
        'name_ar' => 'تفسیر ابنِ کثیر',
        'language_code' => 'ar',
        'version' => 1,
    ]);
    $catalogue = Resource::factory()->create([
        'group' => ResourceGroup::Tafsirs,
        'source_key' => '16',
        'name_ar' => 'التفسير الميسر',
        'language_code' => 'ar',
        'version' => 1,
    ]);
    $none = Resource::factory()->create([
        'group' => ResourceGroup::Tafsirs,
        'source_key' => '15',
        'name_ar' => null,
        'language_code' => 'ar',
        'version' => 1,
    ]);
    foreach ([$overridden, $catalogue, $none] as $resource) {
        app(PackBuilder::class)->build($resource);
    }

    $names = collect($this->getJson('/api/v1/content/manifest')->json('resources'))
        ->mapWithKeys(fn (array $entry): array => [$entry['id'] => $entry['name_ar']])
        ->all();

    expect($names)->toBe([
        $overridden->id => 'تفسير ابن كثير',
        $catalogue->id => 'التفسير الميسر',
        $none->id => null,
    ]);
});

it('serves the configured Arabic author for a QF id and null otherwise', function (): void {
    $overridden = Resource::factory()->create([
        'group' => ResourceGroup::Tafsirs,
        'source_key' => '14',
        'author_name' => 'Ibn Kathir',
        'language_code' => 'ar',
        'version' => 1,
    ]);
    $none = Resource::factory()->create([
        'group' => ResourceGroup::Tafsirs,
        'source_key' => '16',
        'author_name' => 'Al-Sa\'di',
        'language_code' => 'ar',
        'version' => 1,
    ]);
    $mushaf = Resource::factory()->create([
        'group' => ResourceGroup::Mushafs,
        'source_key' => '14',
        'author_name' => 'Mushaf author',
        'language_code' => 'ar',
        'version' => 1,
    ]);
    foreach ([$overridden, $none, $mushaf] as $resource) {
        app(PackBuilder::class)->build($resource);
    }

    $authors = collect($this->getJson('/api/v1/content/manifest')->json('resources'))
        ->mapWithKeys(fn (array $entry): array => [$entry['id'] => $entry['author_ar']])
        ->all();

    expect($authors)->toEqualCanonicalizing([
        $overridden->id => 'ابن كثير',
        $none->id => null,
        $mushaf->id => null,
    ]);
});

it('changes the manifest ETag when the configured Arabic author changes', function (): void {
    $tafsir = Resource::factory()->create([
        'group' => ResourceGroup::Tafsirs,
        'source_key' => '14',
        'language_code' => 'ar',
        'version' => 1,
    ]);
    app(PackBuilder::class)->build($tafsir);

    $first = $this->getJson('/api/v1/content/manifest');
    config()->set('quran.display_authors.ar.14', 'ابن كثير الدمشقي');
    $second = $this->getJson('/api/v1/content/manifest');

    $first->assertJsonPath('resources.0.author_ar', 'ابن كثير');
    $second->assertJsonPath('resources.0.author_ar', 'ابن كثير الدمشقي');
    expect($second->headers->get('ETag'))->not->toBe($first->headers->get('ETag'));
});

it('serves the approved Arabic author of a hadith collection in the manifest', function (): void {
    config([
        'hadith_titles.collections.bukhari.author_ar' => 'FIXTURE author 1 — not a name',
        'hadith_titles.collections.bukhari.author_ar_status' => 'approved',
    ]);
    $collection = hadithCollectionResource('bukhari');
    app(PackBuilder::class)->build($collection);

    $this->getJson('/api/v1/content/manifest')
        ->assertJsonPath('resources.0.author_ar', 'FIXTURE author 1 — not a name')
        ->assertJsonPath('resources.0.author_name', null);
});

it('serves a null author for a hadith collection with no approved author', function (): void {
    config([
        'hadith_titles.collections.qudsi40.author_ar' => null,
        'hadith_titles.collections.qudsi40.author_ar_status' => 'approved',
    ]);
    $collection = hadithCollectionResource('qudsi40');
    app(PackBuilder::class)->build($collection);

    $this->getJson('/api/v1/content/manifest')
        ->assertJsonPath('resources.0.author_ar', null)
        ->assertJsonPath('resources.0.author_name', null);
});

it('marks only the configured chapter recitation as the default', function (): void {
    $default = packedRecitation('7', 'مشاري راشد العفاسي');
    $other = packedRecitation('6', 'محمود خليل الحصري');
    $tafsir = Resource::factory()->create([
        'group' => ResourceGroup::Tafsirs,
        'source_key' => '7',
        'language_code' => 'ar',
        'version' => 1,
        'is_active' => true,
    ]);
    app(PackBuilder::class)->build($tafsir);

    $flags = collect($this->getJson('/api/v1/content/manifest')->json('resources'))
        ->mapWithKeys(fn (array $entry): array => [$entry['id'] => $entry['is_default']])
        ->all();

    expect($flags)->toBe([
        $default->id => true,
        $other->id => false,
        $tafsir->id => false,
    ]);
});

it('moves the default flag and changes the manifest ETag when the configured recitation changes', function (): void {
    $afasy = packedRecitation('7', 'مشاري راشد العفاسي');
    $husary = packedRecitation('6', 'محمود خليل الحصري');

    $first = $this->getJson('/api/v1/content/manifest');
    config()->set('quran.default_recitation', 6);
    $second = $this->getJson('/api/v1/content/manifest');

    $first->assertJsonPath('resources.0.id', $afasy->id)
        ->assertJsonPath('resources.0.is_default', true)
        ->assertJsonPath('resources.1.id', $husary->id)
        ->assertJsonPath('resources.1.is_default', false);
    $second->assertJsonPath('resources.0.is_default', false)
        ->assertJsonPath('resources.1.is_default', true);
    expect($second->headers->get('ETag'))->not->toBe($first->headers->get('ETag'));
});

it('serves a recitation arabic name from the reciter and null without one', function (): void {
    $named = packedRecitation('7', 'مشاري راشد العفاسي', 'اسم المورد');
    $missing = packedRecitation('6', null, null);
    $catalogue = packedRecitation('12', null, 'اسم الفهرس');

    $names = collect($this->getJson('/api/v1/content/manifest')->json('resources'))
        ->mapWithKeys(fn (array $entry): array => [$entry['id'] => $entry['name_ar']])
        ->all();

    expect($names)->toBe([
        $named->id => 'مشاري راشد العفاسي',
        $missing->id => null,
        $catalogue->id => 'اسم الفهرس',
    ]);
});

it('includes a recitation style and null for every other group', function (): void {
    $recitation = packedRecitation('7', 'مشاري راشد العفاسي', style: 'Murattal');
    $tafsir = Resource::factory()->create([
        'group' => ResourceGroup::Tafsirs,
        'source_key' => '16',
        'language_code' => 'ar',
        'version' => 1,
        'is_active' => true,
    ]);
    app(PackBuilder::class)->build($tafsir);

    $styles = collect($this->getJson('/api/v1/content/manifest')->json('resources'))
        ->mapWithKeys(fn (array $entry): array => [$entry['id'] => $entry['style']])
        ->all();

    expect($styles)->toBe([
        $recitation->id => 'Murattal',
        $tafsir->id => null,
    ]);
});

it('returns null style when a recitation has no style', function (): void {
    $unstyled = packedRecitation('6', 'محمود خليل الحصري', style: null);
    $missing = Resource::factory()->create([
        'group' => ResourceGroup::ChapterRecitations,
        'source_key' => '12',
        'version' => 1,
        'is_active' => true,
    ]);
    app(PackBuilder::class)->build($missing);

    $styles = collect($this->getJson('/api/v1/content/manifest')->json('resources'))
        ->mapWithKeys(fn (array $entry): array => [$entry['id'] => $entry['style']])
        ->all();

    expect($styles)->toBe([
        $unstyled->id => null,
        $missing->id => null,
    ]);
});

it('keeps the manifest query count flat as recitations are added', function (): void {
    packedRecitation('7', 'مشاري راشد العفاسي', style: 'Murattal');

    DB::flushQueryLog();
    DB::enableQueryLog();
    $this->getJson('/api/v1/content/manifest')
        ->assertOk()
        ->assertJsonCount(1, 'resources')
        ->assertJsonPath('resources.0.style', 'Murattal');
    $one = DB::getQueryLog();

    packedRecitation('6', 'محمود خليل الحصري', style: 'Mujawwad');

    DB::flushQueryLog();
    $this->getJson('/api/v1/content/manifest')
        ->assertOk()
        ->assertJsonCount(2, 'resources')
        ->assertJsonPath('resources.0.style', 'Murattal')
        ->assertJsonPath('resources.1.style', 'Mujawwad');
    $two = DB::getQueryLog();

    expect(recitationQueries($one))->toBe(1)
        ->and(recitationQueries($two))->toBe(1)
        ->and(count($two))->toBe(count($one));
});

it('never marks an MP3Quran recitation default, even when its moshaf id equals the default QF reciter', function (): void {
    Event::fake([ResourceContentChanged::class]);
    $default = (int) config('quran.default_recitation');
    mp3QuranTestManifest([mp3QuranTestMoshaf($default, [1])]);
    app(Mp3QuranImporter::class)->import();
    $mp3 = Resource::query()->where('source_key', (string) $default)
        ->whereHas('source', fn ($query) => $query->where('code', 'mp3quran'))
        ->sole();
    app(PackBuilder::class)->build($mp3);

    $flags = collect($this->getJson('/api/v1/content/manifest')->json('resources'))
        ->mapWithKeys(fn (array $entry): array => [$entry['id'] => $entry['is_default']])
        ->all();

    expect($flags)->toBe([$mp3->id => false]);
});

it('lists each manifest entry with its source key as a string', function (): void {
    $tafsir = Resource::factory()->create([
        'group' => ResourceGroup::Tafsirs,
        'source_key' => 'key-fixture-1',
        'version' => 1,
        'is_active' => true,
    ]);

    app(PackBuilder::class)->build($tafsir);

    $entry = collect($this->getJson('/api/v1/content/manifest')->assertOk()->json('resources'))
        ->firstWhere('id', $tafsir->id);

    expect($entry)->not->toBeNull()
        ->and($entry)->toHaveKey('key')
        ->and($entry['key'])->toBe($tafsir->source_key)
        ->and($entry['key'])->toBe('key-fixture-1');
});
