<?php

declare(strict_types=1);

require_once __DIR__.'/../../../Support/AzkarAudioTestManifest.php';

use App\Domains\Azkar\Audio\AzkarAudioManifest;
use App\Domains\Azkar\Audio\AzkarAudioSync;
use App\Domains\Azkar\Exceptions\AudioException;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

/*
| ADR 0040 decision 2 and plan step 14 §4: azkar:audio-sync puts each shipped recording on the azkar_audio disk. Every
| file is checked against the manifest's size and SHA-256 before it is renamed into place. Placeholder bytes only.
*/

const SYNC_ONE = 'FIXTURE audio one';
const SYNC_TWO = 'FIXTURE audio two, longer';

beforeEach(function (): void {
    Http::preventStrayRequests();
    Storage::fake('azkar_audio');
    config(['azkar.audio_version' => '0.0.2', 'azkar.audio.base_url' => 'https://audio.opendua.org']);
});

afterEach(function (): void {
    File::deleteDirectory(azkarAudioTestDir());
    File::deleteDirectory(azkarAudioTestDir().'-from');
});

it('downloads each shipped file, verifies it and stores it under the version folder', function (): void {
    azkarAudioTestManifest(['OD-901.mp3' => SYNC_ONE, 'OD-902.mp3' => SYNC_TWO]);
    Http::fake([
        'audio.opendua.org/hisn/v0.0.2/OD-901.mp3' => Http::response(SYNC_ONE, 200, ['Content-Type' => 'audio/mpeg']),
        'audio.opendua.org/hisn/v0.0.2/OD-902.mp3' => Http::response(SYNC_TWO, 200, ['Content-Type' => 'audio/mpeg']),
    ]);

    $result = app(AzkarAudioSync::class)->run();

    expect($result)->toBe(['shipped' => 2, 'present' => 0, 'written' => 2, 'failed' => []])
        ->and(Storage::disk('azkar_audio')->get('0.0.2/OD-901.mp3'))->toBe(SYNC_ONE)
        ->and(Storage::disk('azkar_audio')->get('0.0.2/OD-902.mp3'))->toBe(SYNC_TWO);
});

it('is resumable: a file already present and verified is skipped and not requested again', function (): void {
    azkarAudioTestManifest(['OD-901.mp3' => SYNC_ONE, 'OD-902.mp3' => SYNC_TWO]);
    Storage::disk('azkar_audio')->put('0.0.2/OD-901.mp3', SYNC_ONE);
    Http::fake([
        'audio.opendua.org/hisn/v0.0.2/OD-902.mp3' => Http::response(SYNC_TWO, 200),
    ]);

    $result = app(AzkarAudioSync::class)->run();

    expect($result)->toMatchArray(['present' => 1, 'written' => 1, 'failed' => []]);
    Http::assertSentCount(1);
    Http::assertSent(fn ($request): bool => str_ends_with($request->url(), '/OD-902.mp3'));
});

it('replaces a file that is on disk with the wrong bytes', function (): void {
    azkarAudioTestManifest(['OD-901.mp3' => SYNC_ONE]);
    Storage::disk('azkar_audio')->put('0.0.2/OD-901.mp3', 'damaged bytes that differ');
    Http::fake(['audio.opendua.org/*' => Http::response(SYNC_ONE, 200)]);

    $result = app(AzkarAudioSync::class)->run();

    expect($result)->toMatchArray(['written' => 1, 'failed' => []])
        ->and(Storage::disk('azkar_audio')->get('0.0.2/OD-901.mp3'))->toBe(SYNC_ONE);
});

it('refuses a download whose SHA-256 is wrong: nothing is kept under the final name, and the run reports it', function (): void {
    azkarAudioTestManifest(['OD-901.mp3' => SYNC_ONE]);
    Http::fake(['audio.opendua.org/*' => Http::response('FIXTURE wrong bytes!', 200)]);

    $result = app(AzkarAudioSync::class)->run();

    expect($result)->toMatchArray(['written' => 0, 'failed' => ['OD-901.mp3']])
        ->and(Storage::disk('azkar_audio')->exists('0.0.2/OD-901.mp3'))->toBeFalse()
        ->and(Storage::disk('azkar_audio')->allFiles('0.0.2'))->toBe([]);
});

it('reports a file the server does not answer for, and keeps going', function (): void {
    azkarAudioTestManifest(['OD-901.mp3' => SYNC_ONE, 'OD-902.mp3' => SYNC_TWO]);
    Http::fake([
        'audio.opendua.org/hisn/v0.0.2/OD-901.mp3' => Http::response('not found', 404),
        'audio.opendua.org/hisn/v0.0.2/OD-902.mp3' => Http::response(SYNC_TWO, 200),
    ]);

    $result = app(AzkarAudioSync::class)->run();

    expect($result)->toMatchArray(['written' => 1, 'failed' => ['OD-901.mp3']]);
});

it('never fetches a track of an excluded entry (config azkar.excluded_entries)', function (): void {
    // OD-050 is the file of entry 50, which is excluded (ADR 0031 §11, amended 1 Nov 2026).
    azkarAudioTestManifest(['OD-050.mp3' => SYNC_ONE, 'OD-901.mp3' => SYNC_TWO]);
    Http::fake(['audio.opendua.org/*' => Http::response(SYNC_TWO, 200)]);

    $result = app(AzkarAudioSync::class)->run();

    expect($result)->toMatchArray(['shipped' => 1, 'written' => 1]);
    Http::assertSent(fn ($request): bool => str_ends_with($request->url(), '/OD-901.mp3'));
    Http::assertNotSent(fn ($request): bool => str_contains($request->url(), 'OD-050'));
});

it('copies the files from a folder with --from, and still checks each one', function (): void {
    azkarAudioTestManifest(['OD-901.mp3' => SYNC_ONE, 'OD-902.mp3' => SYNC_TWO]);
    $from = azkarAudioTestDir().'-from';
    File::ensureDirectoryExists($from);
    File::put($from.'/OD-901.mp3', SYNC_ONE);
    File::put($from.'/OD-902.mp3', 'FIXTURE wrong bytes!');

    $this->artisan('azkar:audio-sync', ['--from' => $from])->assertExitCode(1);

    expect(Storage::disk('azkar_audio')->get('0.0.2/OD-901.mp3'))->toBe(SYNC_ONE)
        ->and(Storage::disk('azkar_audio')->exists('0.0.2/OD-902.mp3'))->toBeFalse();
    Http::assertNothingSent();
});

it('the command succeeds when every shipped file is verified', function (): void {
    azkarAudioTestManifest(['OD-901.mp3' => SYNC_ONE]);
    Http::fake(['audio.opendua.org/*' => Http::response(SYNC_ONE, 200)]);

    $this->artisan('azkar:audio-sync')
        ->expectsOutputToContain('All shipped recordings are present and verified.')
        ->assertExitCode(0);
});

it('refuses to run when the manifest does not match its pin, and fetches nothing', function (): void {
    azkarAudioTestManifest(['OD-901.mp3' => SYNC_ONE]);
    config(['azkar.audio.manifest_sha256' => str_repeat('0', 64)]);

    expect(fn () => app(AzkarAudioManifest::class)->shipped())->toThrow(AudioException::class, 'does not match');

    $this->artisan('azkar:audio-sync')->assertExitCode(1);
    Http::assertNothingSent();
});
