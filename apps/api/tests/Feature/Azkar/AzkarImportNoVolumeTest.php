<?php

declare(strict_types=1);

require_once __DIR__.'/../../Support/AzkarAudioTestManifest.php';

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;

/*
| B1 (2 Nov 2026): the Azkar import runs at web start, where the volume holds the audio, never in the pre-deploy container.
| An import that cannot see the audio leaves every recording row out (AzkarTransformer needs the file at the manifest
| size), so this test pins that behaviour: the report says so and no recording row is written. The start-order guard
| lives in tests/Feature/Deploy/StartupConfigTest.php. Placeholder fixture only (ADR 0031 §9).
*/

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Bus::fake();
    // The audio disk is empty: this is the pre-deploy container, or a volume that lost its files.
    Storage::fake('azkar_audio');
    // No snapshot is read: both snapshot dates point at a folder that does not exist (ADR 0042).
    config([
        'azkar.hisnmuslim.snapshot_date' => '1900-01-01',
        'azkar.hadeethenc.snapshot_date' => '1900-01-01',
        'azkar.opendua.catalogue_sha256' => hash_file('sha256', base_path('tests/Fixtures/azkar/opendua-fixture.json')),
        'azkar.quran_references' => [
            'hisn-al-muslim:entry-000004:evening:1' => [[1, 1, 7, 'status' => 'reviewed', 'evidence' => 'fixture'], [2, 1, null, 'status' => 'reviewed', 'evidence' => 'fixture']],
        ],
        'azkar.audio_version' => '0.0.2',
    ]);
    azkarAudioTestManifest(['OD-901.mp3' => 'FIXTURE audio bytes']);
});

afterEach(function (): void {
    File::deleteDirectory(storage_path('framework/testing/azkar-noaudio'));
});

it('with no audio on the disk, leaves every recording out, says so in the report and writes no recording row', function (): void {
    $report = storage_path('framework/testing/azkar-noaudio/'.bin2hex(random_bytes(4)).'.json');

    $this->artisan('azkar:import', [
        'path' => base_path('tests/Fixtures/azkar/opendua-fixture.json'),
        '--defer-pack' => true,
        '--report' => $report,
    ])
        ->expectsOutputToContain('recordings missing file (left out)')
        ->assertExitCode(0);

    expect(DB::table('azkar_recordings')->count())->toBe(0);
});
