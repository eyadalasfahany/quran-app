<?php

declare(strict_types=1);

require_once __DIR__.'/../../Support/AzkarAudioTestManifest.php';

use App\Domains\Azkar\Data\ImportReport;
use App\Domains\Azkar\Services\AzkarImporter;
use App\Domains\Content\Jobs\BuildContentPackJob;
use App\Domains\Content\Models\ContentPack;
use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Resource;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;

/*
| Plan step 14 §3 and §2: a re-import with identical content does not bump the Azkar resource version or rebuild the
| pack; each input that changes a stored row does; --defer-pack writes rows and queues nothing. Placeholder fixture only
| (ADR 0031 §9): every text is «نص تجريبي» or FIXTURE, never a dhikr.
*/

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Bus::fake();
    Storage::fake('azkar_audio');
    // No snapshot is read: both snapshot dates point at a folder that does not exist (ADR 0042).
    config([
        'azkar.hisnmuslim.snapshot_date' => '1900-01-01',
        'azkar.hadeethenc.snapshot_date' => '1900-01-01',
        'azkar.opendua.catalogue_sha256' => hash_file('sha256', fprFixture()),
        'azkar.quran_references' => [
            'hisn-al-muslim:entry-000004:evening:1' => [[1, 1, 7, 'status' => 'reviewed', 'evidence' => 'fixture'], [2, 1, null, 'status' => 'reviewed', 'evidence' => 'fixture']],
        ],
        'azkar.audio_version' => '0.0.2',
    ]);
    ContentSource::query()->where('code', 'opendua')->update(['permission_status' => 'granted']);
    azkarAudioTestManifest(['OD-901.mp3' => 'FIXTURE audio bytes']);
});

afterEach(function (): void {
    File::deleteDirectory(storage_path('framework/testing/azkar-fpr'));
    File::deleteDirectory(azkarAudioTestDir());
});

function fprFixture(): string
{
    return base_path('tests/Fixtures/azkar/opendua-fixture.json');
}

function fprImport(bool $deferPack = false): ImportReport
{
    return app(AzkarImporter::class)->run(fprFixture(), false, false, false, null, null, $deferPack);
}

function fprResource(): Resource
{
    return Resource::query()->where('group', 'azkar')->firstOrFail();
}

it('stores a fingerprint on the first import, bumps the version once and queues the pack', function (): void {
    $report = fprImport();

    expect($report->status)->toBe(ImportReport::STATUS_IMPORTED)
        ->and(fprResource()->version)->toBe(1)
        ->and(fprResource()->import_fingerprint)->toMatch('/^[0-9a-f]{64}$/');

    Bus::assertDispatched(BuildContentPackJob::class);
});

it('a re-import with identical content reports unchanged: no version bump, no row replacement, no pack work', function (): void {
    fprImport();
    $before = fprResource();
    $fingerprint = $before->import_fingerprint;
    Bus::fake();

    $report = fprImport();

    expect($report->status)->toBe(ImportReport::STATUS_UNCHANGED)
        ->and($report->succeeded())->toBeTrue()
        ->and($report->resource['pack'])->toBe(['built' => false, 'queued' => false, 'reason' => 'unchanged'])
        ->and(fprResource()->version)->toBe($before->version)
        ->and(fprResource()->import_fingerprint)->toBe($fingerprint);

    Bus::assertNotDispatched(BuildContentPackJob::class);
});

it('the command prints unchanged and exits 0 on a second identical run', function (): void {
    $this->artisan('azkar:import', ['path' => fprFixture(), '--report' => storage_path('framework/testing/azkar-fpr/a.json')])->assertExitCode(0);

    $this->artisan('azkar:import', ['path' => fprFixture(), '--report' => storage_path('framework/testing/azkar-fpr/b.json')])
        ->expectsOutputToContain('unchanged')
        ->assertExitCode(0);

    expect(fprResource()->version)->toBe(1);
});

it('a change to a stored value bumps the version', function (): void {
    fprImport();
    config(['azkar.chapter_titles_ar' => [1 => 'عنوان تجريبي مختلف']]);

    $report = fprImport();

    expect($report->status)->toBe(ImportReport::STATUS_IMPORTED)
        ->and(fprResource()->version)->toBe(2);
});

it('each input that changes a stored row flips the fingerprint', function (string $change, callable $apply): void {
    fprImport();
    $before = fprResource()->import_fingerprint;

    $apply();
    $report = fprImport();

    expect($report->status)->toBe(ImportReport::STATUS_IMPORTED, "no re-import after: $change")
        ->and(fprResource()->import_fingerprint)->not->toBe($before, "fingerprint did not move: $change");
})->with([
    'an entry left out by config' => ['excluded entry', function (): void {
        config(['azkar.excluded_entries' => ['hisn-al-muslim:entry-000001' => 'fixture']]);
    }],
    'a chapter Arabic title' => ['chapter title', function (): void {
        config(['azkar.chapter_titles_ar' => [1 => 'عنوان تجريبي آخر']]);
    }],
    'a recording file that appears on the audio disk' => ['recording file', function (): void {
        Storage::disk('azkar_audio')->put('0.0.2/OD-901.mp3', 'FIXTURE audio bytes');
    }],
    'the recording attribution, with its file present' => ['attribution', function (): void {
        Storage::disk('azkar_audio')->put('0.0.2/OD-901.mp3', 'FIXTURE audio bytes');
        config(['azkar.recording_rights.attribution_en' => 'FIXTURE other attribution']);
    }],
]);

it('--defer-pack writes the rows and dispatches no job and builds no pack file', function (): void {
    $this->artisan('azkar:import', [
        'path' => fprFixture(),
        '--defer-pack' => true,
        '--report' => storage_path('framework/testing/azkar-fpr/nopack.json'),
    ])->assertExitCode(0);

    Bus::assertNotDispatched(BuildContentPackJob::class);

    expect(fprResource()->version)->toBe(1)
        ->and(ContentPack::query()->count())->toBe(0)
        ->and(Storage::disk('local')->allFiles())->toBe([]);
});

it('--defer-pack and --build-packs together are refused', function (): void {
    $this->artisan('azkar:import', [
        'path' => fprFixture(),
        '--defer-pack' => true,
        '--build-packs' => true,
        '--report' => storage_path('framework/testing/azkar-fpr/both.json'),
    ])->assertExitCode(1);

    expect(Resource::query()->count())->toBe(0);
});
