<?php

declare(strict_types=1);

use App\Integrations\AppStores\AppleStoreClient;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Sleep;

const APPLE_TEST_ID = '6828097265';
const APPLE_TEST_BUNDLE = 'com.taybahapp.taybah';

beforeEach(function (): void {
    Http::preventStrayRequests();
    Sleep::fake();
});

function appleLookupBody(int $resultCount, string $bundleId, string $version): array
{
    return [
        'resultCount' => $resultCount,
        'results' => [['bundleId' => $bundleId, 'version' => $version]],
    ];
}

it('returns the version of the matching app from the lookup', function (): void {
    Http::fake([
        'itunes.apple.com/lookup*' => Http::response(appleLookupBody(1, APPLE_TEST_BUNDLE, '1.0.1')),
    ]);

    expect(app(AppleStoreClient::class)->latestVersion(APPLE_TEST_ID, APPLE_TEST_BUNDLE))->toBe('1.0.1');

    Http::assertSent(fn ($request): bool => $request->url() === 'https://itunes.apple.com/lookup?id='.APPLE_TEST_ID);
});

it('returns null when the bundle id does not match', function (): void {
    Http::fake([
        'itunes.apple.com/lookup*' => Http::response(appleLookupBody(1, 'com.example.other', '1.0.1')),
    ]);

    expect(app(AppleStoreClient::class)->latestVersion(APPLE_TEST_ID, APPLE_TEST_BUNDLE))->toBeNull();
});

it('returns null when the lookup finds no app', function (): void {
    Http::fake([
        'itunes.apple.com/lookup*' => Http::response(['resultCount' => 0, 'results' => []]),
    ]);

    expect(app(AppleStoreClient::class)->latestVersion(APPLE_TEST_ID, APPLE_TEST_BUNDLE))->toBeNull();
});

it('returns null on a server error', function (): void {
    Http::fake([
        'itunes.apple.com/lookup*' => Http::response('', 500),
    ]);

    expect(app(AppleStoreClient::class)->latestVersion(APPLE_TEST_ID, APPLE_TEST_BUNDLE))->toBeNull();
});

it('returns null when the connection fails', function (): void {
    Http::fake([
        'itunes.apple.com/lookup*' => fn () => throw new ConnectionException('timeout'),
    ]);

    expect(app(AppleStoreClient::class)->latestVersion(APPLE_TEST_ID, APPLE_TEST_BUNDLE))->toBeNull();
});

it('returns null when the version is not dotted digits', function (string $version): void {
    Http::fake([
        'itunes.apple.com/lookup*' => Http::response(appleLookupBody(1, APPLE_TEST_BUNDLE, $version)),
    ]);

    expect(app(AppleStoreClient::class)->latestVersion(APPLE_TEST_ID, APPLE_TEST_BUNDLE))->toBeNull();
})->with([
    'letters' => ['1.0.x'],
    'empty' => [''],
    'trailing dot' => ['1.0.'],
    'pre-release tag' => ['1.0.1-beta'],
]);
