<?php

declare(strict_types=1);

use App\Integrations\QuranFoundation\ContentSyncClient;
use App\Integrations\QuranFoundation\MutationType;
use App\Integrations\QuranFoundation\QuranFoundationException;
use Carbon\CarbonInterval;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Sleep;
use Tests\Support\QuranFoundationFixture;

beforeEach(function (): void {
    Http::preventStrayRequests();

    config()->set('quran.qf.environment', 'prelive');
    config()->set('quran.qf.client_id', 'test-client-id');
    config()->set('quran.qf.client_secret', 'test-client-secret');
    config()->set('quran.qf.contact_email', 'ops@taybah.test');

    QuranFoundationFixture::forgetBindings();
    Cache::flush();
    Sleep::fake();
});

it('follows relative pages and sends the bootstrap query with api headers', function (): void {
    Http::fake([
        'https://prelive-oauth2.quran.foundation/oauth2/token' => Http::response(QuranFoundationFixture::load('token.json')),
        'https://apis-prelive.quran.foundation/content/*' => Http::sequence()
            ->push(QuranFoundationFixture::load('sync-page-1.json'))
            ->push(QuranFoundationFixture::load('sync-page-2.json')),
    ]);

    $pages = iterator_to_array(app(ContentSyncClient::class)->sync('translations:85', syncToken: 'ignored-token', bootstrap: true));

    expect($pages)->toHaveCount(2)
        ->and($pages[0]->syncUntilSequence)->toBe(10)
        ->and($pages[0]->hasMore)->toBeTrue()
        ->and($pages[0]->nextPageUrl)->toBe('/api/v4/resources/sync?page=2')
        ->and($pages[0]->nextSyncToken)->toBe('sync-token-page-1')
        ->and($pages[0]->mutations)->toHaveCount(1)
        ->and($pages[0]->mutations[0]->type)->toBe(MutationType::ResourceCreate)
        ->and($pages[0]->mutations[0]->resourceGroup)->toBe('translations')
        ->and($pages[0]->mutations[0]->resourceId)->toBe(85)
        ->and($pages[0]->mutations[0]->resourceContentId)->toBeNull()
        ->and($pages[0]->mutations[0]->snapshotUrl)->toBe('/api/v4/resources/snapshots/translations/85')
        ->and($pages[1]->hasMore)->toBeFalse()
        ->and($pages[1]->mutations[0]->type)->toBe(MutationType::RowUpdate)
        ->and($pages[1]->mutations[0]->sourceRecordId)->toBe('1001')
        ->and($pages[1]->mutations[0]->data)->toBe([
            'verse_key' => '1:1',
            'text' => 'sample',
        ]);

    Http::assertSent(function (Request $request): bool {
        if (! str_starts_with($request->url(), 'https://apis-prelive.quran.foundation/content/api/v4/resources/sync?')) {
            return false;
        }

        parse_str((string) parse_url($request->url(), PHP_URL_QUERY), $query);

        return $request->method() === 'GET'
            && $query === [
                'resources' => 'translations:85',
                'per_page' => '100',
                'bootstrap' => 'true',
            ]
            && $request->hasHeader('x-auth-token', 'prelive-access-token')
            && $request->hasHeader('x-client-id', 'test-client-id')
            && $request->hasHeader('User-Agent', 'Taybah/1.0 (+mailto:ops@taybah.test)');
    });
    Http::assertSent(fn (Request $request): bool => $request->url() === 'https://apis-prelive.quran.foundation/content/api/v4/resources/sync?page=2');
});

it('sends a sync token when bootstrap is off', function (): void {
    Http::fake([
        'https://prelive-oauth2.quran.foundation/oauth2/token' => Http::response(QuranFoundationFixture::load('token.json')),
        'https://apis-prelive.quran.foundation/content/*' => Http::response(QuranFoundationFixture::load('sync-page-2.json')),
    ]);

    iterator_to_array(app(ContentSyncClient::class)->sync('translations:85', syncToken: 'cursor-9'));

    Http::assertSent(function (Request $request): bool {
        if (! str_contains($request->url(), '/api/v4/resources/sync?')) {
            return false;
        }

        parse_str((string) parse_url($request->url(), PHP_URL_QUERY), $query);

        return $query === [
            'resources' => 'translations:85',
            'per_page' => '100',
            'sync_token' => 'cursor-9',
        ];
    });
});

it('follows a relative page on the production api base', function (): void {
    Http::fake([
        'https://oauth2.quran.foundation/oauth2/token' => Http::response([
            'access_token' => 'production-access-token',
            'expires_in' => 3599,
            'token_type' => 'bearer',
        ]),
        'https://apis.quran.foundation/content/*' => Http::sequence()
            ->push(QuranFoundationFixture::load('sync-page-1.json'))
            ->push(QuranFoundationFixture::load('sync-page-2.json')),
    ]);

    config()->set('quran.qf.environment', 'production');
    QuranFoundationFixture::forgetBindings();

    iterator_to_array(app(ContentSyncClient::class)->sync('mushafs:*', bootstrap: true));

    Http::assertSent(fn (Request $request): bool => $request->url() === 'https://apis.quran.foundation/content/api/v4/resources/sync?page=2'
        && $request->hasHeader('x-auth-token', 'production-access-token')
        && $request->hasHeader('x-client-id', 'test-client-id'));
    Http::assertNotSent(fn (Request $request): bool => str_contains($request->url(), 'apis-prelive.quran.foundation')
        || $request->hasHeader('x-auth-token', 'prelive-access-token'));
});

it('returns a typed snapshot for a relative snapshot url', function (): void {
    Http::fake([
        'https://prelive-oauth2.quran.foundation/oauth2/token' => Http::response(QuranFoundationFixture::load('token.json')),
        'https://apis-prelive.quran.foundation/content/*' => Http::response(QuranFoundationFixture::load('snapshot.json')),
    ]);

    $snapshot = app(ContentSyncClient::class)->snapshot('/api/v4/resources/snapshots/translations/85');

    expect($snapshot->resourceGroup)->toBe('translations')
        ->and($snapshot->resourceId)->toBe(85)
        ->and($snapshot->resourceContentId)->toBeNull()
        ->and($snapshot->schemaVersion)->toBe(1)
        ->and($snapshot->syncSequence)->toBe(10)
        ->and($snapshot->records)->toBe([
            ['id' => 1, 'verse_key' => '1:1', 'text' => 'do-not-print-this-ayah'],
            ['id' => 2, 'verse_key' => '1:2', 'text' => 'second'],
            ['id' => 3, 'verse_key' => '1:3', 'text' => 'third'],
        ]);

    Http::assertSent(fn (Request $request): bool => $request->url() === 'https://apis-prelive.quran.foundation/content/api/v4/resources/snapshots/translations/85'
        && $request->hasHeader('x-auth-token', 'prelive-access-token'));
});

it('resolves an absolute snapshot url against the current api base', function (): void {
    Http::fake([
        'https://prelive-oauth2.quran.foundation/oauth2/token' => Http::response(QuranFoundationFixture::load('token.json')),
        'https://apis-prelive.quran.foundation/content/*' => Http::response(QuranFoundationFixture::load('snapshot.json')),
    ]);

    app(ContentSyncClient::class)->snapshot('https://apis.quran.foundation/content/api/v4/resources/snapshots/translations/85?sync=1');

    Http::assertSent(fn (Request $request): bool => $request->url() === 'https://apis-prelive.quran.foundation/content/api/v4/resources/snapshots/translations/85?sync=1');
});

it('retries a 429 after the retry-after delay', function (): void {
    Http::fake([
        'https://prelive-oauth2.quran.foundation/oauth2/token' => Http::response(QuranFoundationFixture::load('token.json')),
        'https://apis-prelive.quran.foundation/content/*' => Http::sequence()
            ->push(['message' => 'slow down'], 429, ['Retry-After' => '2'])
            ->push(QuranFoundationFixture::load('sync-page-2.json'), 200),
    ]);

    $pages = iterator_to_array(app(ContentSyncClient::class)->sync('translations:85', bootstrap: true));

    expect($pages)->toHaveCount(1);
    Http::assertSentCount(3);
    Sleep::assertSlept(fn (CarbonInterval $duration): bool => (int) $duration->totalMicroseconds === 2_000_000);
});

it('caps a long retry-after at 30 seconds', function (): void {
    Http::fake([
        'https://prelive-oauth2.quran.foundation/oauth2/token' => Http::response(QuranFoundationFixture::load('token.json')),
        'https://apis-prelive.quran.foundation/content/*' => Http::sequence()
            ->push(['message' => 'slow down'], 429, ['Retry-After' => '3600'])
            ->push(QuranFoundationFixture::load('sync-page-2.json'), 200),
    ]);

    $pages = iterator_to_array(app(ContentSyncClient::class)->sync('translations:85', bootstrap: true));

    expect($pages)->toHaveCount(1);
    Sleep::assertSlept(fn (CarbonInterval $duration): bool => (int) $duration->totalMicroseconds === 30_000_000);
});

it('retries a server error and then returns the page', function (): void {
    Http::fake([
        'https://prelive-oauth2.quran.foundation/oauth2/token' => Http::response(QuranFoundationFixture::load('token.json')),
        'https://apis-prelive.quran.foundation/content/*' => Http::sequence()
            ->push(['message' => 'unavailable'], 503)
            ->push(['message' => 'unavailable'], 503)
            ->push(QuranFoundationFixture::load('sync-page-2.json'), 200),
    ]);

    $pages = iterator_to_array(app(ContentSyncClient::class)->sync('translations:85', bootstrap: true));

    expect($pages)->toHaveCount(1);
    Http::assertSentCount(4);
});

it('gives up after the retry budget on a server error', function (): void {
    Http::fake([
        'https://prelive-oauth2.quran.foundation/oauth2/token' => Http::response(QuranFoundationFixture::load('token.json')),
        'https://apis-prelive.quran.foundation/content/*' => Http::sequence()
            ->push(['message' => 'unavailable'], 503)
            ->push(['message' => 'unavailable'], 503)
            ->push(['message' => 'unavailable'], 503)
            ->push(QuranFoundationFixture::load('sync-page-2.json'), 200),
    ]);

    try {
        iterator_to_array(app(ContentSyncClient::class)->sync('translations:85', bootstrap: true));
        $this->fail('The sync should have failed after the retry budget.');
    } catch (QuranFoundationException $exception) {
        expect($exception->status)->toBe(503)
            ->and($exception->getMessage())->toBe('unavailable');
    }

    Http::assertSentCount(4);
});

it('forgets the token after a 401 and retries the request once', function (): void {
    Http::fake([
        'https://prelive-oauth2.quran.foundation/oauth2/token' => Http::sequence()
            ->push(['access_token' => 'token-a', 'expires_in' => 3599, 'token_type' => 'bearer'])
            ->push(['access_token' => 'token-b', 'expires_in' => 3599, 'token_type' => 'bearer']),
        'https://apis-prelive.quran.foundation/content/*' => Http::sequence()
            ->push(['message' => 'unauthenticated'], 401)
            ->push(QuranFoundationFixture::load('sync-page-2.json'), 200),
    ]);

    $pages = iterator_to_array(app(ContentSyncClient::class)->sync('translations:85', bootstrap: true));

    expect($pages)->toHaveCount(1)
        ->and(Cache::get('qf.oauth.prelive'))->toBe('token-b');

    Http::assertSentInOrder([
        fn (Request $request): bool => $request->url() === 'https://prelive-oauth2.quran.foundation/oauth2/token',
        fn (Request $request): bool => str_contains($request->url(), '/api/v4/resources/sync')
            && $request->hasHeader('x-auth-token', 'token-a'),
        fn (Request $request): bool => $request->url() === 'https://prelive-oauth2.quran.foundation/oauth2/token',
        fn (Request $request): bool => str_contains($request->url(), '/api/v4/resources/sync')
            && $request->hasHeader('x-auth-token', 'token-b'),
    ]);
});

it('throws the api message for a 422 response', function (): void {
    Http::fake([
        'https://prelive-oauth2.quran.foundation/oauth2/token' => Http::response(QuranFoundationFixture::load('token.json')),
        'https://apis-prelive.quran.foundation/content/*' => Http::response(QuranFoundationFixture::load('error-unprocessable.json'), 422),
    ]);

    try {
        iterator_to_array(app(ContentSyncClient::class)->sync('translations:85', bootstrap: true));
        $this->fail('The sync should have failed with the api error.');
    } catch (QuranFoundationException $exception) {
        expect($exception->getMessage())->toBe('resources is required')
            ->and($exception->status)->toBe(422)
            ->and($exception->type)->toBe('unprocessable_entity');
    }

    Http::assertSentCount(2);
});

it('retries a connection failure and then returns the page', function (): void {
    Http::fake([
        'https://prelive-oauth2.quran.foundation/oauth2/token' => Http::response(QuranFoundationFixture::load('token.json')),
        'https://apis-prelive.quran.foundation/content/*' => Http::sequence()
            ->pushFailedConnection()
            ->push(QuranFoundationFixture::load('sync-page-2.json'), 200),
    ]);

    $pages = iterator_to_array(app(ContentSyncClient::class)->sync('translations:85', bootstrap: true));

    expect($pages)->toHaveCount(1);
    Http::assertSentCount(3);
});

it('rejects a sync when credentials are missing before any http call', function (): void {
    config()->set('quran.qf.client_id', '');
    config()->set('quran.qf.client_secret', '');
    QuranFoundationFixture::forgetBindings();

    expect(fn () => iterator_to_array(app(ContentSyncClient::class)->sync('translations:85', bootstrap: true)))
        ->toThrow(QuranFoundationException::class, 'Quran Foundation client id and client secret are required.');

    Http::assertNothingSent();
});
