<?php

declare(strict_types=1);

require_once __DIR__.'/../../../Support/AzkarAudioTestManifest.php';

use App\Domains\Azkar\Audio\AzkarAudioVerifier;
use Illuminate\Support\Facades\Storage;

/*
| Plan step 14 §4: azkar:audio-verify checks presence and size (the start check); --full also hashes every file.
*/

const VERIFY_ONE = 'FIXTURE verify one';
const VERIFY_TWO = 'FIXTURE verify two';

beforeEach(function (): void {
    Storage::fake('azkar_audio');
    config(['azkar.audio_version' => '0.0.2']);
});

it('reports every shipped file present and the right size as verified', function (): void {
    azkarAudioTestManifest(['OD-901.mp3' => VERIFY_ONE, 'OD-902.mp3' => VERIFY_TWO]);
    Storage::disk('azkar_audio')->put('0.0.2/OD-901.mp3', VERIFY_ONE);
    Storage::disk('azkar_audio')->put('0.0.2/OD-902.mp3', VERIFY_TWO);

    expect(app(AzkarAudioVerifier::class)->verify())->toBe([
        'shipped' => 2, 'verified' => 2, 'missing' => [], 'wrong_size' => [], 'wrong_hash' => [],
    ]);
});

it('names a missing file and a file of the wrong size', function (): void {
    azkarAudioTestManifest(['OD-901.mp3' => VERIFY_ONE, 'OD-902.mp3' => VERIFY_TWO]);
    Storage::disk('azkar_audio')->put('0.0.2/OD-901.mp3', 'short');

    expect(app(AzkarAudioVerifier::class)->verify())->toMatchArray([
        'verified' => 0, 'missing' => ['OD-902.mp3'], 'wrong_size' => ['OD-901.mp3'],
    ]);
});

it('the default check does not hash, so a same-size wrong file passes; --full catches it', function (): void {
    azkarAudioTestManifest(['OD-901.mp3' => VERIFY_ONE]);
    Storage::disk('azkar_audio')->put('0.0.2/OD-901.mp3', 'FIXTURE verify ONE'); // same length, different bytes

    expect(app(AzkarAudioVerifier::class)->verify(false)['verified'])->toBe(1)
        ->and(app(AzkarAudioVerifier::class)->verify(true)['wrong_hash'])->toBe(['OD-901.mp3']);
});

it('the command fails and names the missing files, and succeeds when nothing is missing', function (): void {
    azkarAudioTestManifest(['OD-901.mp3' => VERIFY_ONE]);

    $this->artisan('azkar:audio-verify')
        ->expectsOutputToContain('OD-901.mp3')
        ->assertExitCode(1);

    Storage::disk('azkar_audio')->put('0.0.2/OD-901.mp3', VERIFY_ONE);

    $this->artisan('azkar:audio-verify', ['--full' => true])
        ->expectsOutputToContain('Azkar audio verified.')
        ->assertExitCode(0);
});
