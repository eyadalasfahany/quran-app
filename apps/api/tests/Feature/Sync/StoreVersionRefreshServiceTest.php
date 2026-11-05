<?php

declare(strict_types=1);

use App\Domains\Sync\Enums\AppPlatform;
use App\Domains\Sync\Repositories\Contracts\LatestStoreVersionRepository;
use App\Domains\Sync\Services\StoreVersionRefreshService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Sleep;

beforeEach(function (): void {
    Http::preventStrayRequests();
    Sleep::fake();
    Log::spy();
});

it('stores the live version of both stores', function (): void {
    Http::fake([
        'itunes.apple.com/lookup*' => Http::response(['resultCount' => 1, 'results' => [['bundleId' => 'com.taybahapp.taybah', 'version' => '1.0.1']]]),
        'play.google.com/store/apps/details*' => Http::response('[[["1.0.2"]]]'),
    ]);

    app(StoreVersionRefreshService::class)->refresh();

    $versions = app(LatestStoreVersionRepository::class);

    expect($versions->get(AppPlatform::Ios))->toBe('1.0.1')
        ->and($versions->get(AppPlatform::Android))->toBe('1.0.2');

    Log::shouldNotHaveReceived('warning');
});

it('keeps the last known version of a store whose lookup fails and updates the other, with a warning', function (): void {
    $versions = app(LatestStoreVersionRepository::class);
    $versions->put(AppPlatform::Ios, '1.0.0');

    Http::fake([
        'itunes.apple.com/lookup*' => Http::response('', 500),
        'play.google.com/store/apps/details*' => Http::response('[[["1.0.1"]]]'),
    ]);

    app(StoreVersionRefreshService::class)->refresh();

    expect($versions->get(AppPlatform::Ios))->toBe('1.0.0')
        ->and($versions->get(AppPlatform::Android))->toBe('1.0.1');

    Log::shouldHaveReceived('warning')
        ->once()
        ->with(
            'App store version lookup failed for ios; keeping the last known version.',
            ['store' => 'ios'],
        );
});

it('leaves both versions empty when neither lookup finds a version', function (): void {
    Http::fake([
        'itunes.apple.com/lookup*' => Http::response('', 500),
        'play.google.com/store/apps/details*' => Http::response('no version'),
    ]);

    app(StoreVersionRefreshService::class)->refresh();

    $versions = app(LatestStoreVersionRepository::class);

    expect($versions->get(AppPlatform::Ios))->toBeNull()
        ->and($versions->get(AppPlatform::Android))->toBeNull();

    Log::shouldHaveReceived('warning')->twice();
});
