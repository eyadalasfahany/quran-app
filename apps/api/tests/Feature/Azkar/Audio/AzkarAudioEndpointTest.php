<?php

declare(strict_types=1);

require_once __DIR__.'/../../../Support/AzkarAudioTestManifest.php';

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

/*
| ADR 0040 §2 and plan step 14 §5: GET /api/v1/azkar/audio/{version}/{file}. Placeholder bytes only. Headers, Range (206
| and 416), If-None-Match (304), every refusal as a 404 problem, path traversal, and the audio limiter.
*/

uses(RefreshDatabase::class);

const ENDPOINT_BYTES = 'FIXTURE audio endpoint 0123456789';

beforeEach(function (): void {
    Storage::fake('azkar_audio');
    config(['azkar.audio_version' => '0.0.2', 'azkar.audio.rate_limit_per_minute' => 600]);
    azkarAudioTestManifest([
        'OD-901.mp3' => ENDPOINT_BYTES,
        'OD-902-1.mp3' => ENDPOINT_BYTES,
        'OD-050.mp3' => ENDPOINT_BYTES, // an excluded entry: never served, even when the file is on the disk
    ]);
    Storage::disk('azkar_audio')->put('0.0.2/OD-901.mp3', ENDPOINT_BYTES);
    Storage::disk('azkar_audio')->put('0.0.2/OD-050.mp3', ENDPOINT_BYTES);
    $this->withHeaders(['Accept' => 'application/json']);
});

/**
 * The response body of a binary file response, read the way the server sends it.
 */
function endpointBody($response): string
{
    ob_start();
    $response->baseResponse->sendContent();

    return (string) ob_get_clean();
}

it('serves the file with audio/mpeg, immutable caching, a manifest ETag and byte ranges', function (): void {
    $response = $this->get('/api/v1/azkar/audio/0.0.2/OD-901.mp3');

    $response->assertOk()
        ->assertHeader('Content-Type', 'audio/mpeg')
        ->assertHeader('Cache-Control', 'immutable, max-age=31536000, public')
        ->assertHeader('Accept-Ranges', 'bytes')
        ->assertHeader('Content-Length', (string) strlen(ENDPOINT_BYTES))
        ->assertHeader('ETag', '"'.hash('sha256', ENDPOINT_BYTES).'"');

    expect(endpointBody($response))->toBe(ENDPOINT_BYTES);
});

it('answers a Range request with 206, the requested slice and Content-Range', function (): void {
    $response = $this->get('/api/v1/azkar/audio/0.0.2/OD-901.mp3', ['Range' => 'bytes=0-9']);

    $response->assertStatus(206)
        ->assertHeader('Content-Range', 'bytes 0-9/'.strlen(ENDPOINT_BYTES))
        ->assertHeader('Content-Length', '10');

    expect(endpointBody($response))->toBe('FIXTURE au');
});

it('answers an open-ended Range from an offset to the end of the file', function (): void {
    $response = $this->get('/api/v1/azkar/audio/0.0.2/OD-901.mp3', ['Range' => 'bytes=8-']);

    $response->assertStatus(206);
    expect(endpointBody($response))->toBe(substr(ENDPOINT_BYTES, 8));
});

it('answers an unsatisfiable Range with 416', function (): void {
    $this->get('/api/v1/azkar/audio/0.0.2/OD-901.mp3', ['Range' => 'bytes=999999-'])
        ->assertStatus(416)
        ->assertHeader('Content-Range', 'bytes */'.strlen(ENDPOINT_BYTES));
});

it('answers 304 with an empty body when If-None-Match carries the file ETag', function (): void {
    $etag = '"'.hash('sha256', ENDPOINT_BYTES).'"';

    $response = $this->get('/api/v1/azkar/audio/0.0.2/OD-901.mp3', ['If-None-Match' => $etag]);

    $response->assertStatus(304);
    expect(endpointBody($response))->toBe('');
});

it('answers 404 problem details for a version other than the pinned one', function (): void {
    $this->get('/api/v1/azkar/audio/0.0.3/OD-901.mp3')
        ->assertNotFound()
        ->assertHeader('Content-Type', 'application/problem+json')
        ->assertJsonPath('code', 'not_found')
        ->assertJsonPath('status', 404);
});

it('answers 404 for a file name outside the shipped set, for an excluded entry and for a missing file', function (): void {
    $this->get('/api/v1/azkar/audio/0.0.2/OD-999.mp3')->assertNotFound()->assertJsonPath('code', 'not_found');
    $this->get('/api/v1/azkar/audio/0.0.2/OD-050.mp3')->assertNotFound()->assertJsonPath('code', 'not_found');
    $this->get('/api/v1/azkar/audio/0.0.2/OD-902-1.mp3')->assertNotFound()->assertJsonPath('code', 'not_found');
});

it('answers 404 when the file is the wrong size on the disk', function (): void {
    Storage::disk('azkar_audio')->put('0.0.2/OD-901.mp3', 'short');

    $this->get('/api/v1/azkar/audio/0.0.2/OD-901.mp3')->assertNotFound();
});

it('cannot be walked out of the audio folder: traversal and encoded separators are not routed to a file', function (string $path): void {
    Storage::disk('local')->put('secret.txt', 'must not be served');

    $this->get($path)->assertNotFound();

    expect(endpointBody($this->get('/api/v1/azkar/audio/0.0.2/OD-901.mp3')))->toBe(ENDPOINT_BYTES);
})->with([
    '/api/v1/azkar/audio/0.0.2/..%2F..%2Fsecret.txt',
    '/api/v1/azkar/audio/0.0.2/..%2FOD-901.mp3',
    '/api/v1/azkar/audio/..%2F0.0.2/OD-901.mp3',
    '/api/v1/azkar/audio/0.0.2/OD-901.mp3%00.txt',
    '/api/v1/azkar/audio/0.0.2/OD-901.mp3.php',
]);

it('answers 429 with Retry-After after the audio limit in a minute (its own limiter, spec §8)', function (): void {
    config(['azkar.audio.rate_limit_per_minute' => 2]);

    $this->get('/api/v1/azkar/audio/0.0.2/OD-901.mp3')->assertOk();
    $this->get('/api/v1/azkar/audio/0.0.2/OD-901.mp3')->assertOk();

    $this->get('/api/v1/azkar/audio/0.0.2/OD-901.mp3')
        ->assertStatus(429)
        ->assertHeader('Retry-After');
});
