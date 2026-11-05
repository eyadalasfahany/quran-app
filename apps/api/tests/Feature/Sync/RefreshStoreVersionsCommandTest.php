<?php

declare(strict_types=1);

use App\Domains\Sync\Enums\AppPlatform;
use App\Domains\Sync\Repositories\Contracts\LatestStoreVersionRepository;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Sleep;

beforeEach(function (): void {
    Http::preventStrayRequests();
    Sleep::fake();
});

it('looks up both stores, stores the versions and prints them', function (): void {
    Http::fake([
        'itunes.apple.com/lookup*' => Http::response(['resultCount' => 1, 'results' => [['bundleId' => 'com.taybahapp.taybah', 'version' => '1.0.1']]]),
        'play.google.com/store/apps/details*' => Http::response('[[["1.0.1"]]]'),
    ]);

    $this->artisan('app-stores:refresh')
        ->expectsOutput('ios: 1.0.1')
        ->expectsOutput('android: 1.0.1')
        ->assertSuccessful();

    $versions = app(LatestStoreVersionRepository::class);

    expect($versions->get(AppPlatform::Ios))->toBe('1.0.1')
        ->and($versions->get(AppPlatform::Android))->toBe('1.0.1');
});

it('prints none for a store with no known version and still succeeds', function (): void {
    Http::fake([
        'itunes.apple.com/lookup*' => Http::response('', 500),
        'play.google.com/store/apps/details*' => Http::response('', 500),
    ]);

    $this->artisan('app-stores:refresh')
        ->expectsOutput('ios: none')
        ->expectsOutput('android: none')
        ->assertSuccessful();
});
