<?php

declare(strict_types=1);

use App\Domains\Azkar\Exceptions\CatalogueDownloadException;
use App\Domains\Azkar\OpenDua\CatalogueDownloader;
use App\Support\Storage\SourceCache;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

/*
| The download is tested against Http::fake with the placeholder fixture as the "pinned" file (ADR 0031 §1).
*/

beforeEach(function (): void {
    // A real verified download must survive these tests: move it aside and restore it afterwards.
    if (File::exists(SourceCache::path('azkar/catalogue-0.0.4.json'))) {
        File::move(SourceCache::path('azkar/catalogue-0.0.4.json'), SourceCache::path('azkar/catalogue-0.0.4.json.test-backup'));
    }

    config(['azkar.opendua.retry_delay_ms' => 0]);
    config(['azkar.opendua.catalogue_sha256' => hash_file('sha256', base_path('tests/Fixtures/azkar/opendua-fixture.json'))]);
    Http::preventStrayRequests();
});

afterEach(function (): void {
    File::delete(SourceCache::path('azkar/catalogue-0.0.4.json'));

    if (File::exists(SourceCache::path('azkar/catalogue-0.0.4.json.test-backup'))) {
        File::move(SourceCache::path('azkar/catalogue-0.0.4.json.test-backup'), SourceCache::path('azkar/catalogue-0.0.4.json'));
    }
});

function dlFixtureBytes(): string
{
    return (string) file_get_contents(base_path('tests/Fixtures/azkar/opendua-fixture.json'));
}

it('downloads the pinned catalogue to storage with the Taybah user agent and writes it only after the SHA-256 matches', function (): void {
    Http::fake(['opendua.hdfund.org/*' => Http::response(dlFixtureBytes())]);

    $path = app(CatalogueDownloader::class)->download();

    expect($path)->toEndWith('catalogue-0.0.4.json')
        ->and(File::get($path))->toBe(dlFixtureBytes());

    Http::assertSent(fn ($request): bool => $request->url() === 'https://opendua.hdfund.org/v0.0.4/catalogue.json'
        && str_starts_with($request->header('User-Agent')[0] ?? '', 'Taybah/1.0'));
});

it('refuses bytes that do not match the pin and writes nothing', function (): void {
    config(['azkar.opendua.catalogue_sha256' => str_repeat('0', 64)]);
    Http::fake(['opendua.hdfund.org/*' => Http::response(dlFixtureBytes())]);

    expect(fn () => app(CatalogueDownloader::class)->download())
        ->toThrow(CatalogueDownloadException::class, 'does not match the pinned SHA-256');

    expect(File::exists(SourceCache::path('azkar/catalogue-0.0.4.json')))->toBeFalse();
});

it('fails with the status when the server does not answer successfully', function (): void {
    Http::fake(['opendua.hdfund.org/*' => Http::response('', 500)]);

    expect(fn () => app(CatalogueDownloader::class)->download())
        ->toThrow(CatalogueDownloadException::class, 'HTTP 500');
});

it('the import command downloads, verifies and dry-runs without writing rows', function (): void {
    config(['azkar.quran_references' => ['hisn-al-muslim:entry-000004:evening:1' => [
        [1, 1, 7, 'status' => 'reviewed', 'evidence' => 'fixture'],
        [2, 1, null, 'status' => 'reviewed', 'evidence' => 'fixture'],
    ]]]);
    Http::fake(['opendua.hdfund.org/*' => Http::response(dlFixtureBytes())]);
    $report = storage_path('framework/testing/azkar-map/download-report.json');

    $this->artisan('azkar:import', ['--download' => true, '--dry-run' => true, '--report' => $report])
        ->expectsOutputToContain('Downloaded and verified')
        ->assertExitCode(0);

    File::delete(storage_path('framework/testing/azkar-map/download-report.json'));
});

it('the import command needs a path or --download, and not both', function (): void {
    $this->artisan('azkar:import')->assertExitCode(1);
    $this->artisan('azkar:import', ['path' => base_path('tests/Fixtures/azkar/opendua-fixture.json'), '--download' => true])
        ->assertExitCode(1);
});
