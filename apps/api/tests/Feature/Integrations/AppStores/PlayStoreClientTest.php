<?php

declare(strict_types=1);

use App\Integrations\AppStores\PlayStoreClient;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Sleep;

const PLAY_TEST_BUNDLE = 'com.taybahapp.taybah';

beforeEach(function (): void {
    Http::preventStrayRequests();
    Sleep::fake();
});

/**
 * A listing page with one version marker per entry, as the placeholder values the tests need.
 *
 * @param  list<string>  $versions
 */
function playListingPage(array $versions): string
{
    $markers = array_map(fn (string $version): string => '[[["'.$version.'"]]]', $versions);

    return '<html>AF_initDataCallback({data:['.implode(',', $markers).']})</html>';
}

it('returns the version when the page has a single marker', function (): void {
    Http::fake([
        'play.google.com/store/apps/details*' => Http::response(playListingPage(['1.0.1'])),
    ]);

    expect(app(PlayStoreClient::class)->latestVersion(PLAY_TEST_BUNDLE))->toBe('1.0.1');

    Http::assertSent(function ($request): bool {
        return str_starts_with($request->url(), 'https://play.google.com/store/apps/details?')
            && str_contains($request->url(), 'id='.PLAY_TEST_BUNDLE)
            && str_contains($request->url(), 'hl=en')
            && str_contains($request->url(), 'gl=US')
            && $request->header('User-Agent') === ['Mozilla/5.0'];
    });
});

it('returns the version when two markers carry the same value', function (): void {
    Http::fake([
        'play.google.com/store/apps/details*' => Http::response(playListingPage(['1.0.1', '1.0.1'])),
    ]);

    expect(app(PlayStoreClient::class)->latestVersion(PLAY_TEST_BUNDLE))->toBe('1.0.1');
});

it('returns null when two markers carry different values', function (): void {
    Http::fake([
        'play.google.com/store/apps/details*' => Http::response(playListingPage(['1.0.1', '1.0.0'])),
    ]);

    expect(app(PlayStoreClient::class)->latestVersion(PLAY_TEST_BUNDLE))->toBeNull();
});

it('returns null when the page has no marker', function (): void {
    Http::fake([
        'play.google.com/store/apps/details*' => Http::response('<html>no version here</html>'),
    ]);

    expect(app(PlayStoreClient::class)->latestVersion(PLAY_TEST_BUNDLE))->toBeNull();
});

it('returns null on a server error', function (): void {
    Http::fake([
        'play.google.com/store/apps/details*' => Http::response('', 500),
    ]);

    expect(app(PlayStoreClient::class)->latestVersion(PLAY_TEST_BUNDLE))->toBeNull();
});

it('returns null when the connection fails', function (): void {
    Http::fake([
        'play.google.com/store/apps/details*' => fn () => throw new ConnectionException('timeout'),
    ]);

    expect(app(PlayStoreClient::class)->latestVersion(PLAY_TEST_BUNDLE))->toBeNull();
});
