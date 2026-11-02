<?php

declare(strict_types=1);

require_once __DIR__.'/../../Support/AzkarAudioTestManifest.php';

use App\Domains\Azkar\Services\AzkarImporter;
use App\Domains\Content\Enums\PermissionStatus;
use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Jobs\BuildContentPackJob;
use App\Domains\Content\Models\AzkarRecording;
use App\Domains\Content\Models\ContentPack;
use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Packs\AzkarAudioReadiness;
use App\Domains\Content\Packs\PackBuilder;
use App\Domains\Content\Packs\PackBuildException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;

/*
| Plan step 14 §4 and §7. Packs self-heal: a row whose file is gone is rebuilt, by PackBuilder::build and by the start
| path (content:ensure-packs). An Azkar pack that lists recordings is built only when every listed file is on the audio
| disk at its size. Placeholder fixture only (ADR 0031 §9).
*/

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Bus::fake();
    Storage::fake('local');
    Storage::fake('azkar_audio');
    config([
        'azkar.hisnmuslim.snapshot_date' => '1900-01-01',
        'azkar.hadeethenc.snapshot_date' => '1900-01-01',
        'azkar.opendua.catalogue_sha256' => hash_file('sha256', base_path('tests/Fixtures/azkar/opendua-fixture.json')),
        'azkar.quran_references' => [
            'hisn-al-muslim:entry-000004:evening:1' => [[1, 1, 7, 'status' => 'reviewed', 'evidence' => 'fixture'], [2, 1, null, 'status' => 'reviewed', 'evidence' => 'fixture']],
        ],
        'azkar.audio_version' => '0.0.2',
    ]);
    ContentSource::query()->where('code', 'opendua')->update(['permission_status' => 'granted']);
    azkarAudioTestManifest(['OD-901.mp3' => 'FIXTURE audio bytes']);
});

afterEach(function (): void {
    File::deleteDirectory(azkarAudioTestDir());
});

/**
 * An azkar resource with a recording row (from the fixture import) and, when $withAudio, its audio file on the disk.
 */
function healImportedAzkar(bool $withAudio): Resource
{
    if ($withAudio) {
        Storage::disk('azkar_audio')->put('0.0.2/OD-901.mp3', 'FIXTURE audio bytes');
    }

    app(AzkarImporter::class)->run(base_path('tests/Fixtures/azkar/opendua-fixture.json'), false);

    return Resource::query()->where('group', ResourceGroup::Azkar->value)->firstOrFail();
}

it('builds an azkar pack whose recording file is on the audio disk at its size', function (): void {
    $resource = healImportedAzkar(true);

    $pack = app(PackBuilder::class)->build($resource);

    expect($pack->rowCount)->toBeGreaterThan(0)
        ->and(AzkarRecording::query()->where('resource_id', $resource->id)->count())->toBe(1);
});

it('refuses to build an azkar pack while a recording file is missing: no row, no file, the reason named', function (): void {
    $resource = healImportedAzkar(true);
    Storage::disk('azkar_audio')->delete('0.0.2/OD-901.mp3');
    $resource->version = 2;
    $resource->save();

    expect(fn () => app(PackBuilder::class)->build($resource))
        ->toThrow(PackBuildException::class, 'OD-901.mp3')
        ->and(ContentPack::query()->where('resource_id', $resource->id)->count())->toBe(0)
        ->and(Storage::disk('local')->allFiles())->toBe([]);
});

it('refuses a recording file of the wrong size (a short or damaged file is not packed)', function (): void {
    $resource = healImportedAzkar(true);
    Storage::disk('azkar_audio')->put('0.0.2/OD-901.mp3', 'short');

    expect(fn () => app(AzkarAudioReadiness::class)->assertReady($resource->id))
        ->toThrow(PackBuildException::class, 'OD-901.mp3');
});

it('a pack with no recordings never reads the audio disk', function (): void {
    $resource = Resource::factory()->create([
        'source_id' => ContentSource::query()->create([
            'code' => 'heal-no-audio',
            'name' => 'No audio',
            'licence_url' => 'https://example.com/licence',
            'attribution_ar' => 'إسناد',
            'attribution_en' => 'Attribution',
            'permission_status' => PermissionStatus::Granted,
        ])->id,
        'group' => ResourceGroup::Azkar,
        'version' => 1,
    ]);
    DB::table('azkar_chapters')->insert(['resource_id' => $resource->id, 'id' => 1, 'source_chapter_id' => 'chapter-1', 'number' => 1, 'title_ar' => null, 'title_en' => null]);

    Storage::fake('azkar_audio');

    expect(app(PackBuilder::class)->build($resource)->rowCount)->toBe(1)
        ->and(Storage::disk('azkar_audio')->allFiles())->toBe([]);
});

it('rebuilds an azkar pack whose row exists but whose file is gone, instead of returning the stale row', function (): void {
    $resource = healImportedAzkar(true);
    $first = app(PackBuilder::class)->build($resource);
    Storage::disk('local')->delete($first->path);

    $rebuilt = app(PackBuilder::class)->build($resource);

    expect(Storage::disk('local')->exists($rebuilt->path))->toBeTrue()
        ->and(ContentPack::query()->where('resource_id', $resource->id)->count())->toBe(1)
        ->and($rebuilt->sha256)->toBe(hash('sha256', Storage::disk('local')->get($rebuilt->path)));
});

it('the start path (content:ensure-packs) rebuilds a missing azkar pack file', function (): void {
    $resource = healImportedAzkar(true);
    $pack = app(PackBuilder::class)->build($resource);
    Storage::disk('local')->delete($pack->path);

    $this->artisan('content:ensure-packs')
        ->expectsOutputToContain('OK '.$resource->id)
        ->assertExitCode(0);

    expect(Storage::disk('local')->exists($pack->path))->toBeTrue();
});

it('the start path leaves an azkar pack alone while its file is present, and reports nothing to build', function (): void {
    $resource = healImportedAzkar(true);
    app(PackBuilder::class)->build($resource);

    $this->artisan('content:ensure-packs')
        ->expectsOutputToContain('Done: built=0, skipped=1, failed=0')
        ->assertExitCode(0);
});

it('the start path names an azkar pack with missing audio as failed and keeps going (no pack is built)', function (): void {
    $resource = healImportedAzkar(true);
    Storage::disk('azkar_audio')->delete('0.0.2/OD-901.mp3');
    $resource->version = 3;
    $resource->save();

    $this->artisan('content:ensure-packs')
        ->expectsOutputToContain('FAIL '.$resource->id)
        ->assertExitCode(1);

    expect(ContentPack::query()->count())->toBe(0);
});

it('a normal import queues the azkar pack build', function (): void {
    healImportedAzkar(true);

    Bus::assertDispatched(BuildContentPackJob::class);
});
