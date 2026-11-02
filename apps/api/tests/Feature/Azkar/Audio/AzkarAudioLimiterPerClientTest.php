<?php

declare(strict_types=1);

require_once __DIR__.'/../../../Support/AzkarAudioTestManifest.php';

use Illuminate\Support\Facades\Storage;

/*
| H1 (2 Nov 2026): the rate limiters key on the client IP. Behind Railway's edge every request arrives from the proxy, so
| bootstrap/app.php trusts the forwarded headers. Two clients sent through X-Forwarded-For must get separate buckets.
| Placeholder bytes only. No database is used.
*/

const PROXY_BYTES = 'FIXTURE proxy audio 0123456789';

beforeEach(function (): void {
    Storage::fake('azkar_audio');
    config(['azkar.audio_version' => '0.0.2', 'azkar.audio.rate_limit_per_minute' => 1]);
    azkarAudioTestManifest(['OD-901.mp3' => PROXY_BYTES]);
    Storage::disk('azkar_audio')->put('0.0.2/OD-901.mp3', PROXY_BYTES);
});

it('gives each forwarded client its own audio bucket, and limits one client on its own', function (): void {
    $clientA = '198.51.100.'.random_int(1, 120);
    $clientB = '198.51.100.'.random_int(121, 250);
    $url = '/api/v1/azkar/audio/0.0.2/OD-901.mp3';

    $this->get($url, ['X-Forwarded-For' => $clientA])->assertOk();
    $this->get($url, ['X-Forwarded-For' => $clientA])->assertStatus(429);
    $this->get($url, ['X-Forwarded-For' => $clientB])->assertOk();
});
