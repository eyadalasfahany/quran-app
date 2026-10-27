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
use App\Domains\Content\Models\TranslationEntry;
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

it('bootstraps a translation from its snapshot and catalog', function (): void {
    $result = syncTranslations([resourceMutation(10, 'RESOURCE_CREATE')]);

    $resource = Resource::query()->where('source_key', '85')->first();

    expect($result->mutationsApplied)->toBe(1)
        ->and($result->resourcesTouched)->toBe(1)
        ->and($result->rows)->toBe(3)
        ->and($resource)->not->toBeNull()
        ->and($resource->version)->toBe(1)
        ->and($resource->changes_floor_version)->toBe(1)
        ->and($resource->name)->toBe('M.A.S. Abdel Haleem')
        ->and($resource->author_name)->toBe('Abdul Haleem')
        ->and($resource->language_name)->toBe('english')
        ->and($resource->language_code)->toBe('en')
        ->and($resource->direction)->toBe(TextDirection::Ltr)
        ->and($resource->is_active)->toBeTrue()
        ->and($resource->source_sequence)->toBe(42)
        ->and(TranslationEntry::query()->where('resource_id', $resource->id)->count())->toBe(3)
        ->and(TranslationEntry::query()->where('verse_id', 1)->first()?->footnotes)->toBeNull()
        ->and(TranslationEntry::query()->where('verse_id', 2)->first()?->footnotes)->toBe([['text' => 'A note']])
        ->and(TranslationEntry::query()->where('verse_id', 1)->first()?->source_record_id)->toBe(401704);

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
    syncTranslations([resourceMutation(10, 'RESOURCE_CREATE')]);

    fakeFoundation([
        'sync' => syncPage([], 'token-rerun'),
    ]);

    $result = app(ContentSyncService::class)->run(ResourceGroup::Translations, 'translations:*');

    expect($result->mutationsApplied)->toBe(0)
        ->and($result->resourcesTouched)->toBe(0)
        ->and(Resource::query()->where('source_key', '85')->value('version'))->toBe(1)
        ->and(TranslationEntry::query()->count())->toBe(3)
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
    syncTranslations([resourceMutation(10, 'RESOURCE_CREATE')]);

    syncTranslations([
        rowMutation(11, 'ROW_UPDATE', 1, 'Updated name'),
        rowMutation(12, 'ROW_DELETE', 2),
    ], 'token-rows');

    $resource = Resource::query()->where('source_key', '85')->firstOrFail();
    $changes = ContentChange::query()->orderBy('id')->get();

    expect($resource->version)->toBe(2)
        ->and(TranslationEntry::query()->where('resource_id', $resource->id)->orderBy('verse_id')->pluck('verse_id')->all())->toBe([1, 3])
        ->and(TranslationEntry::query()->where('verse_id', 1)->value('text'))->toBe('Updated name')
        ->and($changes)->toHaveCount(2)
        ->and($changes[0]->version)->toBe(2)
        ->and($changes[0]->entity)->toBe('translation_entry')
        ->and($changes[0]->entity_key)->toBe('1')
        ->and($changes[0]->op)->toBe(ChangeOperation::Upsert)
        ->and($changes[0]->payload)->toEqual([
            'resource_id' => $resource->id,
            'verse_id' => 1,
            'text' => 'Updated name',
            'footnotes' => null,
        ])
        ->and($changes[1]->version)->toBe(2)
        ->and($changes[1]->op)->toBe(ChangeOperation::Delete)
        ->and($changes[1]->entity_key)->toBe('2')
        ->and($changes[1]->payload)->toBeNull();
});

it('bumps a resource version once when several row updates share a run', function (): void {
    syncTranslations([resourceMutation(10, 'RESOURCE_CREATE')]);

    syncTranslations([
        rowMutation(11, 'ROW_UPDATE', 1, 'First'),
        rowMutation(12, 'ROW_UPDATE', 2, 'Second'),
    ], 'token-bump');

    $versions = ContentChange::query()->pluck('version')->all();

    expect(Resource::query()->where('source_key', '85')->value('version'))->toBe(2)
        ->and($versions)->toBe([2, 2]);
});

it('replaces every row and raises the floor when a resource is invalidated', function (): void {
    syncTranslations([resourceMutation(10, 'RESOURCE_CREATE')]);

    $snapshot = QuranFoundationFixture::load('translations-snapshot.json');
    $snapshot['records'] = [$snapshot['records'][0]];

    syncTranslations([
        resourceMutation(11, 'RESOURCE_INVALIDATE', snapshotUrl: '/api/v4/resources/snapshots/translations/85?replace=1'),
    ], 'token-invalidate', [
        CONTENT_API.'/api/v4/resources/snapshots/translations/85?replace=1' => $snapshot,
    ]);

    $resource = Resource::query()->where('source_key', '85')->firstOrFail();

    expect($resource->version)->toBe(2)
        ->and($resource->changes_floor_version)->toBe(2)
        ->and(TranslationEntry::query()->where('resource_id', $resource->id)->count())->toBe(1)
        ->and(ContentChange::query()->count())->toBe(0);
});

it('deactivates a resource when it is deleted', function (): void {
    syncTranslations([resourceMutation(10, 'RESOURCE_CREATE')]);

    syncTranslations([
        resourceMutation(11, 'RESOURCE_DELETE'),
    ], 'token-delete');

    $resource = Resource::query()->where('source_key', '85')->firstOrFail();

    expect($resource->is_active)->toBeFalse()
        ->and($resource->version)->toBe(2)
        ->and($resource->changes_floor_version)->toBe(2)
        ->and(ContentChange::query()->count())->toBe(0)
        ->and(TranslationEntry::query()->count())->toBe(3);
});

it('marks an unavailable resource inactive and does not fetch a snapshot', function (): void {
    fakeFoundation([
        'sync' => syncPage([
            resourceMutation(10, 'RESOURCE_CREATE', unavailable: 'not_licensed'),
        ]),
    ]);

    app(ContentSyncService::class)->run(ResourceGroup::Translations, 'translations:*');

    $resource = Resource::query()->where('source_key', '85')->firstOrFail();

    expect($resource->is_active)->toBeFalse()
        ->and($resource->unavailable_reason)->toBe('not_licensed')
        ->and($resource->version)->toBe(0)
        ->and(TranslationEntry::query()->count())->toBe(0);

    Http::assertNotSent(fn (Request $request): bool => str_contains($request->url(), '/snapshots/'));
});

it('resumes after the last committed sequence when a later snapshot fails', function (): void {
    $replace = CONTENT_API.'/api/v4/resources/snapshots/translations/85?replace=1';

    fakeFoundation([
        'sync' => syncPage([
            resourceMutation(10, 'RESOURCE_CREATE'),
            resourceMutation(11, 'RESOURCE_INVALIDATE', snapshotUrl: '/api/v4/resources/snapshots/translations/85?replace=1'),
        ]),
        $replace => Http::response(['message' => 'down'], 500),
    ]);

    expect(fn () => app(ContentSyncService::class)->run(ResourceGroup::Translations, 'translations:*'))
        ->toThrow(QuranFoundationException::class);

    $failed = SyncState::query()->first();
    $failedRun = SyncRun::query()->first();

    expect($failed)->not->toBeNull()
        ->and($failed->last_sequence)->toBe(10)
        ->and($failed->sync_token)->toBeNull()
        ->and($failedRun)->not->toBeNull()
        ->and($failedRun->status)->toBe(SyncRunStatus::Failed)
        ->and(TranslationEntry::query()->count())->toBe(3);

    $replacement = QuranFoundationFixture::load('translations-snapshot.json');
    $replacement['records'] = [$replacement['records'][0]];

    fakeFoundation([
        'sync' => syncPage([
            resourceMutation(10, 'RESOURCE_CREATE'),
            resourceMutation(11, 'RESOURCE_INVALIDATE', snapshotUrl: '/api/v4/resources/snapshots/translations/85?replace=1'),
        ], 'token-resumed'),
        $replace => $replacement,
    ]);

    app(ContentSyncService::class)->run(ResourceGroup::Translations, 'translations:*');

    $resumed = SyncState::query()->first();
    $resumedRun = SyncRun::query()->orderByDesc('id')->first();

    expect($resumed)->not->toBeNull()
        ->and($resumed->last_sequence)->toBe(11)
        ->and($resumed->sync_token)->toBe('token-resumed')
        ->and($resumedRun)->not->toBeNull()
        ->and($resumedRun->status)->toBe(SyncRunStatus::Ok)
        ->and(TranslationEntry::query()->count())->toBe(1);

    Http::assertNotSent(fn (Request $request): bool => $request->url() === CONTENT_API.'/api/v4/resources/snapshots/translations/85');
    Http::assertSent(fn (Request $request): bool => $request->url() === $replace);
});

it('applies pages in order and stores only the final token', function (): void {
    fakeFoundation([
        'sync' => Http::sequence()
            ->push(syncPage([
                resourceMutation(10, 'RESOURCE_CREATE'),
            ], 'token-page-1', true, '/api/v4/resources/sync?page=2'))
            ->push(syncPage([
                rowMutation(11, 'ROW_UPDATE', 1, 'Page two'),
            ], 'token-page-2')),
    ]);

    app(ContentSyncService::class)->run(ResourceGroup::Translations, 'translations:*');

    expect(TranslationEntry::query()->where('verse_id', 1)->value('text'))->toBe('Page two')
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

    expect(fn () => app(ContentSyncService::class)->run(ResourceGroup::Translations, 'translations:*'))
        ->toThrow(SyncException::class, 'Sync mutations are out of sequence.');

    $state = SyncState::query()->first();
    $run = SyncRun::query()->first();

    expect($state)->not->toBeNull()
        ->and($state->last_sequence)->toBe(0)
        ->and($state->sync_token)->toBeNull()
        ->and($run)->not->toBeNull()
        ->and($run->status)->toBe(SyncRunStatus::Failed)
        ->and(TranslationEntry::query()->count())->toBe(0);
});

it('stores translation text byte for byte and copies it into the change', function (): void {
    $text = "In the name  of God\u{064E}\u{200D}\u{200F}.";
    $snapshot = QuranFoundationFixture::load('translations-snapshot.json');
    $snapshot['records'][0]['text'] = $text;

    syncTranslations([
        resourceMutation(10, 'RESOURCE_CREATE'),
        rowMutation(11, 'ROW_UPDATE', 1, $text),
    ], 'token-bytes', [
        'snapshot' => $snapshot,
    ]);

    $stored = TranslationEntry::query()->where('verse_id', 1)->value('text');
    $payload = ContentChange::query()->first()?->payload;

    expect(is_string($stored))->toBeTrue()
        ->and(bin2hex((string) $stored))->toBe(bin2hex($text))
        ->and(is_array($payload))->toBeTrue()
        ->and(bin2hex((string) $payload['text']))->toBe(bin2hex($text));
});

it('rejects a translation record that has no verse id or text', function (): void {
    $snapshot = QuranFoundationFixture::load('translations-snapshot.json');
    unset($snapshot['records'][0]['text']);

    fakeFoundation([
        'sync' => syncPage([resourceMutation(10, 'RESOURCE_CREATE')]),
        'snapshot' => $snapshot,
    ]);

    expect(fn () => app(ContentSyncService::class)->run(ResourceGroup::Translations, 'translations:*'))
        ->toThrow(SyncException::class, 'Translation record is missing verse_id or text.');

    expect(SyncState::query()->value('sync_token'))->toBeNull()
        ->and(TranslationEntry::query()->count())->toBe(0);
});

it('dispatches one content changed event per touched resource', function (): void {
    Event::fake([ResourceContentChanged::class]);

    syncTranslations([
        resourceMutation(10, 'RESOURCE_CREATE'),
        rowMutation(11, 'ROW_UPDATE', 1, 'Touched once'),
    ]);

    $resource = Resource::query()->where('source_key', '85')->firstOrFail();

    Event::assertDispatchedTimes(ResourceContentChanged::class, 1);
    Event::assertDispatched(
        ResourceContentChanged::class,
        fn (ResourceContentChanged $event): bool => $event->resourceId === $resource->id && $event->version === 1,
    );
});

it('dispatches content changed for a committed resource when a later mutation fails', function (): void {
    syncTranslations([resourceMutation(10, 'RESOURCE_CREATE')]);

    Event::fake([ResourceContentChanged::class]);

    $failedSnapshot = CONTENT_API.'/api/v4/resources/snapshots/translations/86';
    $failedCreate = resourceMutation(12, 'RESOURCE_CREATE', snapshotUrl: '/api/v4/resources/snapshots/translations/86');
    $failedCreate['resource_id'] = 86;
    $failedCreate['resource_content_id'] = 86;

    fakeFoundation([
        'sync' => syncPage([
            rowMutation(11, 'ROW_UPDATE', 1, 'Committed before failure'),
            $failedCreate,
        ]),
        $failedSnapshot => Http::response(['message' => 'down'], 500),
    ]);

    expect(fn () => app(ContentSyncService::class)->run(ResourceGroup::Translations, 'translations:*'))
        ->toThrow(QuranFoundationException::class);

    $resource = Resource::query()->where('source_key', '85')->firstOrFail();
    $failedRun = SyncRun::query()->orderByDesc('id')->first();

    expect($resource->version)->toBe(2)
        ->and(TranslationEntry::query()->where('verse_id', 1)->value('text'))->toBe('Committed before failure')
        ->and(Resource::query()->where('source_key', '86')->exists())->toBeFalse()
        ->and($failedRun)->not->toBeNull()
        ->and($failedRun->status)->toBe(SyncRunStatus::Failed);

    Event::assertDispatchedTimes(ResourceContentChanged::class, 1);
    Event::assertDispatched(
        ResourceContentChanged::class,
        fn (ResourceContentChanged $event): bool => $event->resourceId === $resource->id && $event->version === 2,
    );
});

it('reads the translation catalog', function (): void {
    fakeFoundation();

    $entries = app(ContentCatalogClient::class)->translations();

    expect($entries)->toHaveCount(2)
        ->and($entries[0]->id)->toBe(85)
        ->and($entries[0]->name)->toBe('M.A.S. Abdel Haleem')
        ->and($entries[0]->authorName)->toBe('Abdul Haleem')
        ->and($entries[0]->languageName)->toBe('english')
        ->and($entries[0]->slug)->toBe('en-haleem')
        ->and($entries[1]->authorName)->toBeNull()
        ->and($entries[1]->languageName)->toBe('urdu');
});

it('prints a sync summary and never the record text', function (): void {
    fakeFoundation([
        'sync' => syncPage([resourceMutation(10, 'RESOURCE_CREATE')]),
    ]);

    $this->artisan('content:sync', ['group' => 'translations'])
        ->expectsOutput('mutations_applied: 1')
        ->expectsOutput('resources_touched: 1')
        ->expectsOutput('rows: 3')
        ->doesntExpectOutputToContain('In the name of God')
        ->assertSuccessful();
});

it('schedules each configured group daily at 02:00 UTC', function (): void {
    $events = collect(app(Schedule::class)->events())
        ->filter(fn (object $event): bool => ($event->description ?? null) === SyncQuranFoundationJob::class);

    $groups = config('quran.sync.groups');

    expect($events)->toHaveCount(is_array($groups) ? count($groups) : 0);

    expect($events->every(fn (object $event): bool => $event->expression === '0 2 * * *' && $event->timezone === 'UTC'))->toBeTrue();

    $job = new SyncQuranFoundationJob(ResourceGroup::Translations, 'translations:*');

    expect($job->tries)->toBe(1)
        ->and($job->queue)->toBe('sync')
        ->and($job->uniqueId())->toBe('translations');
});

/**
 * @param  list<array<string, mixed>>  $mutations
 * @param  array<string, mixed>  $extra
 */
function syncTranslations(array $mutations, string $token = 'token-final', array $extra = []): SyncRunResult
{
    fakeFoundation([
        'sync' => syncPage($mutations, $token),
        ...$extra,
    ]);

    return app(ContentSyncService::class)->run(ResourceGroup::Translations, 'translations:*');
}

/**
 * @param  array<string, mixed>  $routes
 */
function fakeFoundation(array $routes = []): void
{
    Http::swap(new Factory);
    Http::preventStrayRequests();

    $snapshot = $routes['snapshot'] ?? QuranFoundationFixture::load('translations-snapshot.json');
    unset($routes['snapshot']);

    $sync = $routes['sync'] ?? syncPage([]);
    unset($routes['sync']);

    $map = [
        'https://prelive-oauth2.quran.foundation/oauth2/token' => Http::response(QuranFoundationFixture::load('token.json')),
        CONTENT_API.'/api/v4/resources/translations' => Http::response(QuranFoundationFixture::load('translations-catalog.json')),
        CONTENT_API.'/api/v4/resources/snapshots/translations/85' => Http::response(is_array($snapshot) ? $snapshot : []),
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
function resourceMutation(int $sequence, string $type, ?string $unavailable = null, ?string $snapshotUrl = '/api/v4/resources/snapshots/translations/85'): array
{
    return [
        'sequence' => $sequence,
        'type' => $type,
        'resource_group' => 'translations',
        'resource_id' => 85,
        'resource_content_id' => 85,
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
function rowMutation(int $sequence, string $type, int $verseId, string $text = 'row'): array
{
    return [
        'sequence' => $sequence,
        'type' => $type,
        'resource_group' => 'translations',
        'resource_id' => 85,
        'resource_content_id' => 85,
        'record_type' => null,
        'record_key' => (string) $verseId,
        'source_record_id' => null,
        'changed_at' => '2026-10-27T12:00:00.000Z',
        'data' => $type === 'ROW_DELETE' ? null : [
            'id' => 500000 + $verseId,
            'verse_id' => $verseId,
            'verse_key' => '1:'.$verseId,
            'text' => $text,
            'foot_notes' => [],
        ],
        'snapshot_url' => null,
        'unavailable_reason' => null,
    ];
}
