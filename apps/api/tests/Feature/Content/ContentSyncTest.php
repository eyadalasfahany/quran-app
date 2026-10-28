<?php

declare(strict_types=1);

use App\Domains\Content\Data\SyncRunResult;
use App\Domains\Content\Enums\ChangeOperation;
use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Enums\SyncRunStatus;
use App\Domains\Content\Enums\TextDirection;
use App\Domains\Content\Events\ResourceContentChanged;
use App\Domains\Content\Jobs\SyncQuranFoundationJob;
use App\Domains\Content\Models\ContentChange;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Models\SyncRun;
use App\Domains\Content\Models\SyncState;
use App\Domains\Content\Models\TafsirEntry;
use App\Domains\Content\Services\ContentSyncService;
use App\Domains\Content\Sync\SyncException;
use App\Integrations\QuranFoundation\ContentCatalogClient;
use App\Integrations\QuranFoundation\QuranFoundationException;
use Database\Seeders\ContentSourceSeeder;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Factory;
use Illuminate\Http\Client\Request;
use Illuminate\Http\Client\Response;
use Illuminate\Http\Client\ResponseSequence;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Sleep;
use Tests\Support\QuranFoundationFixture;

uses(RefreshDatabase::class);

const CONTENT_API = 'https://apis-prelive.quran.foundation/content';

beforeEach(function (): void {
    Http::preventStrayRequests();
    Sleep::fake();

    config()->set('quran.qf.environment', 'prelive');
    config()->set('quran.qf.client_id', 'test-client-id');
    config()->set('quran.qf.client_secret', 'test-client-secret');
    config()->set('quran.qf.contact_email', 'ops@taybah.test');

    QuranFoundationFixture::forgetBindings();
    $this->seed(ContentSourceSeeder::class);
});

it('bootstraps a tafsir from its snapshot and catalog', function (): void {
    $result = syncTafsirs([resourceMutation(10, 'RESOURCE_CREATE')]);

    $resource = Resource::query()->where('source_key', '169')->first();

    expect($result->mutationsApplied)->toBe(1)
        ->and($result->resourcesTouched)->toBe(1)
        ->and($result->rows)->toBe(3)
        ->and($resource)->not->toBeNull()
        ->and($resource->version)->toBe(1)
        ->and($resource->changes_floor_version)->toBe(1)
        ->and($resource->name)->toBe('Ibn Kathir')
        ->and($resource->author_name)->toBe('Ibn Kathir')
        ->and($resource->language_name)->toBe('english')
        ->and($resource->language_code)->toBe('en')
        ->and($resource->direction)->toBe(TextDirection::Ltr)
        ->and($resource->is_active)->toBeTrue()
        ->and($resource->source_sequence)->toBe(42)
        ->and(TafsirEntry::query()->where('resource_id', $resource->id)->count())->toBe(3)
        ->and(TafsirEntry::query()->where('group_tafsir_id', 82641)->value('html'))->toBe('<p>First tafsir</p>')
        ->and(TafsirEntry::query()->where('group_tafsir_id', 82642)->value('html'))->toBe('<p>Second tafsir</p>')
        ->and(TafsirEntry::query()->where('group_tafsir_id', 82641)->value('source_hash'))->toBe(hash('sha256', '<p>First tafsir</p>'));

    $state = SyncState::query()->first();
    $run = SyncRun::query()->first();

    expect($state)->not->toBeNull()
        ->and($state->sync_token)->toBe('token-final')
        ->and($state->last_sequence)->toBe(10)
        ->and($state->last_error)->toBeNull()
        ->and($run)->not->toBeNull()
        ->and($run->status)->toBe(SyncRunStatus::Ok)
        ->and($run->mutations_applied)->toBe(1)
        ->and(ContentChange::query()->count())->toBe(0);
});

it('sends the stored token on a rerun and leaves the version unchanged', function (): void {
    syncTafsirs([resourceMutation(10, 'RESOURCE_CREATE')]);

    fakeFoundation([
        'sync' => syncPage([], 'token-rerun'),
    ]);

    $result = app(ContentSyncService::class)->run(ResourceGroup::Tafsirs, 'tafsirs:*');

    expect($result->mutationsApplied)->toBe(0)
        ->and($result->resourcesTouched)->toBe(0)
        ->and(Resource::query()->where('source_key', '169')->value('version'))->toBe(1)
        ->and(TafsirEntry::query()->count())->toBe(3)
        ->and(SyncState::query()->value('sync_token'))->toBe('token-rerun');

    Http::assertSent(function (Request $request): bool {
        if (! str_contains($request->url(), '/api/v4/resources/sync?')) {
            return false;
        }

        parse_str((string) parse_url($request->url(), PHP_URL_QUERY), $query);

        return ($query['sync_token'] ?? null) === 'token-final'
            && ! array_key_exists('bootstrap', $query);
    });
});

it('applies a row update and a row delete at the next version', function (): void {
    syncTafsirs([resourceMutation(10, 'RESOURCE_CREATE')]);

    syncTafsirs([
        rowMutation(11, 'ROW_UPDATE', 82641, '<p>Updated tafsir</p>'),
        rowMutation(12, 'ROW_DELETE', 82642),
    ], 'token-rows');

    $resource = Resource::query()->where('source_key', '169')->firstOrFail();
    $changes = ContentChange::query()->orderBy('id')->get();

    expect($resource->version)->toBe(2)
        ->and(TafsirEntry::query()->where('resource_id', $resource->id)->orderBy('group_tafsir_id')->pluck('group_tafsir_id')->all())->toBe([82641, 82643])
        ->and(TafsirEntry::query()->where('group_tafsir_id', 82641)->value('html'))->toBe('<p>Updated tafsir</p>')
        ->and($changes)->toHaveCount(2)
        ->and($changes[0]->version)->toBe(2)
        ->and($changes[0]->entity)->toBe('tafsir_entry')
        ->and($changes[0]->entity_key)->toBe('82641')
        ->and($changes[0]->op)->toBe(ChangeOperation::Upsert)
        ->and($changes[0]->payload)->toEqual([
            'resource_id' => $resource->id,
            'group_tafsir_id' => 82641,
            'first_verse_id' => 1,
            'last_verse_id' => 1,
            'html' => '<p>Updated tafsir</p>',
        ])
        ->and($changes[1]->version)->toBe(2)
        ->and($changes[1]->op)->toBe(ChangeOperation::Delete)
        ->and($changes[1]->entity_key)->toBe('82642')
        ->and($changes[1]->payload)->toBeNull();
});

it('bumps a resource version once when several row updates share a run', function (): void {
    syncTafsirs([resourceMutation(10, 'RESOURCE_CREATE')]);

    syncTafsirs([
        rowMutation(11, 'ROW_UPDATE', 82641, '<p>First</p>'),
        rowMutation(12, 'ROW_UPDATE', 82642, '<p>Second</p>'),
    ], 'token-bump');

    $versions = ContentChange::query()->pluck('version')->all();

    expect(Resource::query()->where('source_key', '169')->value('version'))->toBe(2)
        ->and($versions)->toBe([2, 2]);
});

it('replaces every row and raises the floor when a resource is invalidated', function (): void {
    syncTafsirs([resourceMutation(10, 'RESOURCE_CREATE')]);

    syncTafsirs([
        resourceMutation(11, 'RESOURCE_INVALIDATE', snapshotUrl: '/api/v4/resources/snapshots/tafsirs/169?replace=1'),
    ], 'token-invalidate', [
        CONTENT_API.'/api/v4/resources/snapshots/tafsirs/169?replace=1' => tafsirSnapshot([tafsirSyncRecord(82641, '<p>First tafsir</p>')]),
    ]);

    $resource = Resource::query()->where('source_key', '169')->firstOrFail();

    expect($resource->version)->toBe(2)
        ->and($resource->changes_floor_version)->toBe(2)
        ->and(TafsirEntry::query()->where('resource_id', $resource->id)->count())->toBe(1)
        ->and(ContentChange::query()->count())->toBe(0);
});

it('deactivates a resource when it is deleted', function (): void {
    syncTafsirs([resourceMutation(10, 'RESOURCE_CREATE')]);

    syncTafsirs([
        resourceMutation(11, 'RESOURCE_DELETE'),
    ], 'token-delete');

    $resource = Resource::query()->where('source_key', '169')->firstOrFail();

    expect($resource->is_active)->toBeFalse()
        ->and($resource->version)->toBe(2)
        ->and($resource->changes_floor_version)->toBe(2)
        ->and(ContentChange::query()->count())->toBe(0)
        ->and(TafsirEntry::query()->count())->toBe(3);
});

it('marks an unavailable resource inactive and does not fetch a snapshot', function (): void {
    fakeFoundation([
        'sync' => syncPage([
            resourceMutation(10, 'RESOURCE_CREATE', unavailable: 'not_licensed'),
        ]),
    ]);

    app(ContentSyncService::class)->run(ResourceGroup::Tafsirs, 'tafsirs:*');

    $resource = Resource::query()->where('source_key', '169')->firstOrFail();

    expect($resource->is_active)->toBeFalse()
        ->and($resource->unavailable_reason)->toBe('not_licensed')
        ->and($resource->version)->toBe(0)
        ->and(TafsirEntry::query()->count())->toBe(0);

    Http::assertNotSent(fn (Request $request): bool => str_contains($request->url(), '/snapshots/'));
});

it('resumes after the last committed sequence when a later snapshot fails', function (): void {
    $replace = CONTENT_API.'/api/v4/resources/snapshots/tafsirs/169?replace=1';

    fakeFoundation([
        'sync' => syncPage([
            resourceMutation(10, 'RESOURCE_CREATE'),
            resourceMutation(11, 'RESOURCE_INVALIDATE', snapshotUrl: '/api/v4/resources/snapshots/tafsirs/169?replace=1'),
        ]),
        $replace => Http::response(['message' => 'down'], 500),
    ]);

    expect(fn () => app(ContentSyncService::class)->run(ResourceGroup::Tafsirs, 'tafsirs:*'))
        ->toThrow(QuranFoundationException::class);

    $failed = SyncState::query()->first();
    $failedRun = SyncRun::query()->first();

    expect($failed)->not->toBeNull()
        ->and($failed->last_sequence)->toBe(10)
        ->and($failed->sync_token)->toBeNull()
        ->and($failedRun)->not->toBeNull()
        ->and($failedRun->status)->toBe(SyncRunStatus::Failed)
        ->and(TafsirEntry::query()->count())->toBe(3);

    fakeFoundation([
        'sync' => syncPage([
            resourceMutation(10, 'RESOURCE_CREATE'),
            resourceMutation(11, 'RESOURCE_INVALIDATE', snapshotUrl: '/api/v4/resources/snapshots/tafsirs/169?replace=1'),
        ], 'token-resumed'),
        $replace => tafsirSnapshot([tafsirSyncRecord(82641, '<p>First tafsir</p>')]),
    ]);

    app(ContentSyncService::class)->run(ResourceGroup::Tafsirs, 'tafsirs:*');

    $resumed = SyncState::query()->first();
    $resumedRun = SyncRun::query()->orderByDesc('id')->first();

    expect($resumed)->not->toBeNull()
        ->and($resumed->last_sequence)->toBe(11)
        ->and($resumed->sync_token)->toBe('token-resumed')
        ->and($resumedRun)->not->toBeNull()
        ->and($resumedRun->status)->toBe(SyncRunStatus::Ok)
        ->and(TafsirEntry::query()->count())->toBe(1);

    Http::assertNotSent(fn (Request $request): bool => $request->url() === CONTENT_API.'/api/v4/resources/snapshots/tafsirs/169');
    Http::assertSent(fn (Request $request): bool => $request->url() === $replace);
});

it('applies pages in order and stores only the final token', function (): void {
    fakeFoundation([
        'sync' => Http::sequence()
            ->push(syncPage([
                resourceMutation(10, 'RESOURCE_CREATE'),
            ], 'token-page-1', true, '/api/v4/resources/sync?page=2'))
            ->push(syncPage([
                rowMutation(11, 'ROW_UPDATE', 82641, '<p>Page two</p>'),
            ], 'token-page-2')),
    ]);

    app(ContentSyncService::class)->run(ResourceGroup::Tafsirs, 'tafsirs:*');

    expect(TafsirEntry::query()->where('group_tafsir_id', 82641)->value('html'))->toBe('<p>Page two</p>')
        ->and(SyncState::query()->value('sync_token'))->toBe('token-page-2')
        ->and(SyncState::query()->value('last_sequence'))->toBe(11);
});

it('rejects a page whose sequences are not ascending', function (): void {
    fakeFoundation([
        'sync' => syncPage([
            resourceMutation(20, 'RESOURCE_CREATE'),
            resourceMutation(11, 'RESOURCE_INVALIDATE'),
        ]),
    ]);

    expect(fn () => app(ContentSyncService::class)->run(ResourceGroup::Tafsirs, 'tafsirs:*'))
        ->toThrow(SyncException::class, 'Sync mutations are out of sequence.');

    $state = SyncState::query()->first();
    $run = SyncRun::query()->first();

    expect($state)->not->toBeNull()
        ->and($state->last_sequence)->toBe(0)
        ->and($state->sync_token)->toBeNull()
        ->and($run)->not->toBeNull()
        ->and($run->status)->toBe(SyncRunStatus::Failed)
        ->and(TafsirEntry::query()->count())->toBe(0);
});

it('stores tafsir source text byte for byte and copies it into the change', function (): void {
    $text = "<p>In the name  of God\u{064E}\u{200D}\u{200F}.</p>";

    syncTafsirs([
        resourceMutation(10, 'RESOURCE_CREATE'),
        rowMutation(11, 'ROW_UPDATE', 82641, $text),
    ], 'token-bytes');

    $stored = TafsirEntry::query()->where('group_tafsir_id', 82641)->value('html');
    $payload = ContentChange::query()->first()?->payload;

    expect(is_string($stored))->toBeTrue()
        ->and(bin2hex((string) $stored))->toBe(bin2hex($text))
        ->and(TafsirEntry::query()->where('group_tafsir_id', 82641)->value('source_hash'))->toBe(hash('sha256', $text))
        ->and(is_array($payload))->toBeTrue()
        ->and(bin2hex((string) $payload['html']))->toBe(bin2hex($text));
});

it('rejects a tafsir record that has no text', function (): void {
    $snapshot = tafsirSnapshot([tafsirSyncRecord(82641, '<p>First tafsir</p>')]);
    unset($snapshot['records'][0]['text']);

    fakeFoundation([
        'sync' => syncPage([resourceMutation(10, 'RESOURCE_CREATE')]),
        'snapshot' => $snapshot,
    ]);

    expect(fn () => app(ContentSyncService::class)->run(ResourceGroup::Tafsirs, 'tafsirs:*'))
        ->toThrow(SyncException::class, 'Sync record is missing text.');

    expect(SyncState::query()->value('sync_token'))->toBeNull()
        ->and(TafsirEntry::query()->count())->toBe(0);
});

it('dispatches one content changed event per touched resource', function (): void {
    Event::fake([ResourceContentChanged::class]);

    syncTafsirs([
        resourceMutation(10, 'RESOURCE_CREATE'),
        rowMutation(11, 'ROW_UPDATE', 82641, '<p>Touched once</p>'),
    ]);

    $resource = Resource::query()->where('source_key', '169')->firstOrFail();

    Event::assertDispatchedTimes(ResourceContentChanged::class, 1);
    Event::assertDispatched(
        ResourceContentChanged::class,
        fn (ResourceContentChanged $event): bool => $event->resourceId === $resource->id && $event->version === 1,
    );
});

it('dispatches content changed for a committed resource when a later mutation fails', function (): void {
    syncTafsirs([resourceMutation(10, 'RESOURCE_CREATE')]);

    Event::fake([ResourceContentChanged::class]);

    $failedSnapshot = CONTENT_API.'/api/v4/resources/snapshots/tafsirs/170';
    $failedCreate = resourceMutation(12, 'RESOURCE_CREATE', snapshotUrl: '/api/v4/resources/snapshots/tafsirs/170');
    $failedCreate['resource_id'] = 170;
    $failedCreate['resource_content_id'] = 170;

    fakeFoundation([
        'sync' => syncPage([
            rowMutation(11, 'ROW_UPDATE', 82641, '<p>Committed before failure</p>'),
            $failedCreate,
        ]),
        $failedSnapshot => Http::response(['message' => 'down'], 500),
    ]);

    expect(fn () => app(ContentSyncService::class)->run(ResourceGroup::Tafsirs, 'tafsirs:*'))
        ->toThrow(QuranFoundationException::class);

    $resource = Resource::query()->where('source_key', '169')->firstOrFail();
    $failedRun = SyncRun::query()->orderByDesc('id')->first();

    expect($resource->version)->toBe(2)
        ->and(TafsirEntry::query()->where('group_tafsir_id', 82641)->value('html'))->toBe('<p>Committed before failure</p>')
        ->and(Resource::query()->where('source_key', '170')->exists())->toBeFalse()
        ->and($failedRun)->not->toBeNull()
        ->and($failedRun->status)->toBe(SyncRunStatus::Failed);

    Event::assertDispatchedTimes(ResourceContentChanged::class, 1);
    Event::assertDispatched(
        ResourceContentChanged::class,
        fn (ResourceContentChanged $event): bool => $event->resourceId === $resource->id && $event->version === 2,
    );
});

it('reads the tafsir catalog', function (): void {
    fakeFoundation();

    $entries = app(ContentCatalogClient::class)->tafsirs();

    expect($entries)->toHaveCount(2)
        ->and($entries[0]->id)->toBe(169)
        ->and($entries[0]->name)->toBe('Ibn Kathir')
        ->and($entries[0]->authorName)->toBe('Ibn Kathir')
        ->and($entries[0]->languageName)->toBe('english')
        ->and($entries[0]->slug)->toBe('ibn-kathir')
        ->and($entries[1]->authorName)->toBeNull()
        ->and($entries[1]->languageName)->toBe('arabic');
});

it('prints a sync summary and never the record text', function (): void {
    fakeFoundation([
        'sync' => syncPage([resourceMutation(10, 'RESOURCE_CREATE')]),
    ]);

    $this->artisan('content:sync', ['group' => 'tafsirs'])
        ->expectsOutput('mutations_applied: 1')
        ->expectsOutput('resources_touched: 1')
        ->expectsOutput('rows: 3')
        ->doesntExpectOutputToContain('First tafsir')
        ->assertSuccessful();
});

it('schedules each configured group daily at 02:00 UTC', function (): void {
    $events = collect(app(Schedule::class)->events())
        ->filter(fn (object $event): bool => ($event->description ?? null) === SyncQuranFoundationJob::class);

    $groups = config('quran.sync.groups');

    expect($events)->toHaveCount(is_array($groups) ? count($groups) : 0);

    expect($events->every(fn (object $event): bool => $event->expression === '0 2 * * *' && $event->timezone === 'UTC'))->toBeTrue();

    $job = new SyncQuranFoundationJob(ResourceGroup::Tafsirs, 'tafsirs:*');

    expect($job->tries)->toBe(1)
        ->and($job->queue)->toBe('sync')
        ->and($job->uniqueId())->toBe('tafsirs');
});

it('skips translation mutations in a page without writing rows or failing', function (): void {
    Log::spy();

    $translationCreate = QuranFoundationFixture::load('sync-page-1.json')['sync']['mutations'][0];
    $translationCreate['sequence'] = 11;
    $translationRow = QuranFoundationFixture::load('sync-page-2.json')['sync']['mutations'][0];
    $translationRow['sequence'] = 12;

    $result = syncTafsirs([
        resourceMutation(10, 'RESOURCE_CREATE'),
        $translationCreate,
        $translationRow,
        rowMutation(13, 'ROW_UPDATE', 82641, '<p>After translations</p>'),
    ], 'token-mixed');

    expect($result->mutationsApplied)->toBe(2)
        ->and(TafsirEntry::query()->count())->toBe(3)
        ->and(TafsirEntry::query()->where('group_tafsir_id', 82641)->value('html'))->toBe('<p>After translations</p>')
        ->and(ContentChange::query()->count())->toBe(1)
        ->and(Resource::query()->where('source_key', '85')->exists())->toBeFalse()
        ->and(SyncState::query()->value('sync_token'))->toBe('token-mixed')
        ->and(SyncState::query()->value('last_sequence'))->toBe(13)
        ->and(SyncRun::query()->value('status'))->toBe(SyncRunStatus::Ok);

    Http::assertNotSent(fn (Request $request): bool => str_contains($request->url(), '/snapshots/translations/'));

    Log::shouldHaveReceived('info')
        ->with('Quran Foundation sync skipped mutations for an ignored resource group.', ['resource_group' => 'translations'])
        ->once();
});

/**
 * @param  list<array<string, mixed>>  $mutations
 * @param  array<string, mixed>  $extra
 */
function syncTafsirs(array $mutations, string $token = 'token-final', array $extra = []): SyncRunResult
{
    fakeFoundation([
        'sync' => syncPage($mutations, $token),
        ...$extra,
    ]);

    return app(ContentSyncService::class)->run(ResourceGroup::Tafsirs, 'tafsirs:*');
}

/**
 * @param  array<string, mixed>  $routes
 */
function fakeFoundation(array $routes = []): void
{
    Http::swap(new Factory);
    Http::preventStrayRequests();

    $snapshot = $routes['snapshot'] ?? tafsirSnapshot([
        tafsirSyncRecord(82641, '<p>First tafsir</p>'),
        tafsirSyncRecord(82642, '<p>Second tafsir</p>'),
        tafsirSyncRecord(82643, '<p>Third tafsir</p>'),
    ]);
    unset($routes['snapshot']);

    $sync = $routes['sync'] ?? syncPage([]);
    unset($routes['sync']);

    $map = [
        'https://prelive-oauth2.quran.foundation/oauth2/token' => Http::response(QuranFoundationFixture::load('token.json')),
        CONTENT_API.'/api/v4/resources/tafsirs' => Http::response([
            'tafsirs' => [
                ['id' => 169, 'name' => 'Ibn Kathir', 'author_name' => 'Ibn Kathir', 'slug' => 'ibn-kathir', 'language_name' => 'english'],
                ['id' => 170, 'name' => 'Al-Qurtubi', 'author_name' => null, 'slug' => 'al-qurtubi', 'language_name' => 'arabic'],
            ],
        ]),
        CONTENT_API.'/api/v4/resources/snapshots/tafsirs/169' => Http::response(is_array($snapshot) ? $snapshot : []),
        CONTENT_API.'/api/v4/resources/sync*' => $sync instanceof ResponseSequence
            ? $sync
            : Http::response(is_array($sync) ? $sync : []),
    ];

    foreach ($routes as $url => $body) {
        if (! is_string($url)) {
            continue;
        }

        $map[$url] = $body instanceof ResponseSequence || $body instanceof Response
            ? $body
            : Http::response(is_array($body) ? $body : []);
    }

    Http::fake($map);
}

/**
 * @param  list<array<string, mixed>>  $records
 * @return array<string, mixed>
 */
function tafsirSnapshot(array $records): array
{
    return [
        'resource_group' => 'tafsirs',
        'resource_id' => 169,
        'resource_content_id' => 169,
        'schema_version' => 1,
        'sync_sequence' => 42,
        'records' => $records,
    ];
}

/**
 * @return array<string, mixed>
 */
function tafsirSyncRecord(int $groupTafsirId, string $text, int $verseId = 1): array
{
    return [
        'id' => $groupTafsirId,
        'verse_id' => $verseId,
        'verse_key' => '1:'.$verseId,
        'group_verse_key_from' => '1:1',
        'group_verse_key_to' => '1:1',
        'group_verses_count' => 1,
        'group_tafsir_id' => $groupTafsirId,
        'start_verse_id' => $verseId,
        'end_verse_id' => $verseId,
        'text' => $text,
    ];
}

/**
 * @param  list<array<string, mixed>>  $mutations
 * @return array<string, mixed>
 */
function syncPage(array $mutations, string $token = 'token-final', bool $hasMore = false, ?string $next = null): array
{
    return [
        'sync' => [
            'sync_until_sequence' => 1000,
            'has_more' => $hasMore,
            'next_page_url' => $next,
            'next_sync_token' => $token,
            'mutations' => $mutations,
        ],
    ];
}

/**
 * @return array<string, mixed>
 */
function resourceMutation(int $sequence, string $type, ?string $unavailable = null, ?string $snapshotUrl = '/api/v4/resources/snapshots/tafsirs/169'): array
{
    return [
        'sequence' => $sequence,
        'type' => $type,
        'resource_group' => 'tafsirs',
        'resource_id' => 169,
        'resource_content_id' => 169,
        'record_type' => null,
        'record_key' => null,
        'source_record_id' => null,
        'changed_at' => '2026-10-27T12:00:00.000Z',
        'data' => null,
        'snapshot_url' => $type === 'RESOURCE_DELETE' ? null : $snapshotUrl,
        'unavailable_reason' => $unavailable,
    ];
}

/**
 * @return array<string, mixed>
 */
function rowMutation(int $sequence, string $type, int $groupTafsirId, string $text = '<p>row</p>'): array
{
    return [
        'sequence' => $sequence,
        'type' => $type,
        'resource_group' => 'tafsirs',
        'resource_id' => 169,
        'resource_content_id' => 169,
        'record_type' => null,
        'record_key' => (string) $groupTafsirId,
        'source_record_id' => null,
        'changed_at' => '2026-10-27T12:00:00.000Z',
        'data' => $type === 'ROW_DELETE' ? null : tafsirSyncRecord($groupTafsirId, $text),
        'snapshot_url' => null,
        'unavailable_reason' => null,
    ];
}
