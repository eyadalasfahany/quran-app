<?php

declare(strict_types=1);

use App\Domains\Sync\Enums\AppPlatform;
use App\Domains\Sync\Repositories\Contracts\LatestStoreVersionRepository;

it('returns the stored live store versions and the store links', function (): void {
    $versions = app(LatestStoreVersionRepository::class);
    $versions->put(AppPlatform::Ios, '1.2.0');
    $versions->put(AppPlatform::Android, '1.3.0');

    $this->getJson('/api/v1/bootstrap')->assertOk()->assertExactJson([
        'min_app_version' => ['ios' => '1.2.0', 'android' => '1.3.0'],
        'store_url' => [
            'ios' => 'https://apps.apple.com/app/id6828097265',
            'android' => 'https://play.google.com/store/apps/details?id=com.taybahapp.taybah',
        ],
    ]);
});

it('returns null minimum versions when no store version is stored yet', function (): void {
    $this->getJson('/api/v1/bootstrap')->assertOk()->assertExactJson([
        'min_app_version' => ['ios' => null, 'android' => null],
        'store_url' => [
            'ios' => 'https://apps.apple.com/app/id6828097265',
            'android' => 'https://play.google.com/store/apps/details?id=com.taybahapp.taybah',
        ],
    ]);
});

it('defaults the store links to the App Store and Play Store listings', function (): void {
    expect(config('mobile_app.store_url.ios'))->toBe('https://apps.apple.com/app/id6828097265');
    expect(config('mobile_app.store_url.android'))->toBe('https://play.google.com/store/apps/details?id=com.taybahapp.taybah');

    $this->getJson('/api/v1/bootstrap')->assertOk()->assertJsonPath('store_url', [
        'ios' => 'https://apps.apple.com/app/id6828097265',
        'android' => 'https://play.google.com/store/apps/details?id=com.taybahapp.taybah',
    ]);
});

it('is never cached', function (): void {
    $response = $this->getJson('/api/v1/bootstrap');

    $response->assertOk();
    expect($response->headers->get('Cache-Control'))->toContain('no-store');
});
