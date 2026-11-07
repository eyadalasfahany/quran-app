<?php

declare(strict_types=1);

use App\Support\Storage\SourceCache;
use Tests\TestCase;

uses(TestCase::class);

it('joins the cache root and a relative path with one slash', function (): void {
    config(['content_sources.cache_root' => '/cache/root']);

    expect(SourceCache::path('azkar/hisnmuslim/2001-02-03'))->toBe('/cache/root/azkar/hisnmuslim/2001-02-03');
});

it('returns the cache root without a trailing slash when no relative path is given', function (): void {
    config(['content_sources.cache_root' => '/cache/root']);

    expect(SourceCache::path())->toBe('/cache/root')
        ->and(SourceCache::path(''))->toBe('/cache/root');
});

it('ignores trailing slashes on the root and leading slashes on the relative path', function (): void {
    config(['content_sources.cache_root' => '/cache/root//']);

    expect(SourceCache::path('/duas/hadeethenc/'))->toBe('/cache/root/duas/hadeethenc/')
        ->and(SourceCache::path('///'))->toBe('/cache/root');
});

it('honours a config override', function (): void {
    config(['content_sources.cache_root' => '/mnt/volume/sources']);

    expect(SourceCache::path('azkar'))->toBe('/mnt/volume/sources/azkar');
});

it('defaults to a directory under storage/app/private so it lives on the volume', function (): void {
    // TestCase points cache_root at a temp folder, so the shipped default is read from the config file itself.
    $shippedDefault = (require config_path('content_sources.php'))['cache_root'];

    expect($shippedDefault)->toBe(storage_path('app/private/sources'))
        ->and(str_starts_with($shippedDefault, storage_path('app/private').DIRECTORY_SEPARATOR))->toBeTrue();
});
