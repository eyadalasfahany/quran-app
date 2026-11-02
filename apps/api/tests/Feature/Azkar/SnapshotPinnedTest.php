<?php

declare(strict_types=1);

use App\Domains\Azkar\Sources\HisnMuslimSnapshotter;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;

/*
| Plan step 14 §6: azkar:snapshot --pinned fetches the configured date and keeps the snapshot only when its manifest
| SHA-256 is the configured pin. A mismatching snapshot is deleted; a fetch failure writes nothing. Placeholder bytes only.
*/

const PINNED_DATE = '2001-02-04';

beforeEach(function (): void {
    config([
        'azkar.hisnmuslim.gap_ms' => 0,
        'azkar.hisnmuslim.retry_delay_ms' => 0,
        'azkar.hisnmuslim.snapshot_date' => PINNED_DATE,
        'azkar.hisnmuslim.snapshot_sha256' => str_repeat('0', 64),
    ]);
    Http::preventStrayRequests();
    Http::fake([
        'www.hisnmuslim.com/api/ar/husn_ar.json' => Http::response("\u{FEFF}".json_encode(['العربية' => [['ID' => 1, 'TITLE' => 'FIXTURE chapter one']]], JSON_UNESCAPED_UNICODE)),
        'www.hisnmuslim.com/api/ar/1.json' => Http::response(json_encode(['FIXTURE chapter one' => [['ID' => 1, 'ARABIC_TEXT' => 'FIXTURE text 1 — not a dhikr', 'REPEAT' => 1]]], JSON_UNESCAPED_UNICODE)),
    ]);
});

afterEach(function (): void {
    File::deleteDirectory(storage_path('app/azkar/hisnmuslim/'.PINNED_DATE));
});

it('keeps the snapshot when its manifest SHA-256 is the configured pin', function (): void {
    $sha = app(HisnMuslimSnapshotter::class)->take(PINNED_DATE)['manifest_sha256'];
    config(['azkar.hisnmuslim.snapshot_sha256' => $sha]);

    $this->artisan('azkar:snapshot', ['source' => 'hisnmuslim', '--pinned' => true])
        ->expectsOutputToContain('Snapshot already pinned')
        ->assertExitCode(0);

    expect(File::exists(storage_path('app/azkar/hisnmuslim/'.PINNED_DATE.'/manifest.json')))->toBeTrue();
});

it('fetches and verifies when the pinned folder is missing on disk', function (): void {
    $sha = app(HisnMuslimSnapshotter::class)->take(PINNED_DATE)['manifest_sha256'];
    config(['azkar.hisnmuslim.snapshot_sha256' => $sha]);
    File::deleteDirectory(storage_path('app/azkar/hisnmuslim/'.PINNED_DATE));

    $this->artisan('azkar:snapshot', ['source' => 'hisnmuslim', '--pinned' => true])
        ->expectsOutputToContain('Snapshot verified against the pin')
        ->assertExitCode(0);
});

it('skips the download when the pinned folder already matches every file SHA-256', function (): void {
    $sha = app(HisnMuslimSnapshotter::class)->take(PINNED_DATE)['manifest_sha256'];
    config(['azkar.hisnmuslim.snapshot_sha256' => $sha]);

    $this->artisan('azkar:snapshot', ['source' => 'hisnmuslim', '--pinned' => true])->assertExitCode(0);

    Http::fake(['www.hisnmuslim.com/*' => Http::response('must not be fetched', 500)]);

    $this->artisan('azkar:snapshot', ['source' => 'hisnmuslim', '--pinned' => true])
        ->expectsOutputToContain('Snapshot already pinned')
        ->assertExitCode(0);

    Http::assertNothingSent();
});

it('deletes a snapshot that does not match its pin, and fails', function (): void {
    $this->artisan('azkar:snapshot', ['source' => 'hisnmuslim', '--pinned' => true])
        ->expectsOutputToContain('does not match its pin')
        ->assertExitCode(1);

    expect(File::exists(storage_path('app/azkar/hisnmuslim/'.PINNED_DATE)))->toBeFalse();
});

it('writes nothing and fails when the source does not answer', function (): void {
    Http::fake(['www.hisnmuslim.com/*' => Http::response('server error', 500)]);

    $this->artisan('azkar:snapshot', ['source' => 'hisnmuslim', '--pinned' => true])->assertExitCode(1);

    expect(File::exists(storage_path('app/azkar/hisnmuslim/'.PINNED_DATE)))->toBeFalse();
});

it('refuses --pinned together with --date', function (): void {
    $this->artisan('azkar:snapshot', ['source' => 'hisnmuslim', '--pinned' => true, '--date' => '2001-02-05'])->assertExitCode(1);

    Http::assertNothingSent();
});
