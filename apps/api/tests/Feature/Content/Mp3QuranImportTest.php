<?php

declare(strict_types=1);

require_once __DIR__.'/../../Support/Mp3QuranTestManifest.php';

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Events\ResourceContentChanged;
use App\Domains\Content\Models\ChapterAudioFile;
use App\Domains\Content\Models\ContentPack;
use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Recitation;
use App\Domains\Content\Models\RecitationTiming;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Models\TaybahRecitationTiming;
use App\Domains\Content\Models\TaybahTimingSet;
use App\Domains\Content\Mp3Quran\Mp3QuranImportReport;
use App\Domains\Content\Mp3Quran\Mp3QuranManifestException;
use App\Domains\Content\Services\Mp3QuranImporter;
use App\Domains\Content\Services\RecitationSegmentsFlagService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Http::preventStrayRequests();
    config(['quran.mp3quran_held_moshafs' => []]);
});

function mp3QuranResource(int $moshafId): ?Resource
{
    return Resource::query()
        ->where('source_id', ContentSource::query()->where('code', 'mp3quran')->value('id'))
        ->where('group', ResourceGroup::ChapterRecitations)
        ->where('source_key', (string) $moshafId)
        ->first();
}

function mp3QuranImport(bool $deferPack = false, bool $dryRun = false): Mp3QuranImportReport
{
    return app(Mp3QuranImporter::class)->import($deferPack, $dryRun);
}

function mp3QuranFileUrl(int $moshafId, int $surah): string
{
    return collect(mp3QuranTestMoshaf($moshafId, [$surah])['files'])->first()['url'];
}

it('imports a moshaf: resource, recitation and one file per surah with reserved ids and R2 urls', function (): void {
    Event::fake([ResourceContentChanged::class]);
    mp3QuranTestManifest([mp3QuranTestMoshaf(253, [1, 2, 59], ['moshaf_name' => 'حفص عن عاصم - مرتل'])]);

    $report = mp3QuranImport();

    $resource = mp3QuranResource(253);
    $recitation = Recitation::query()->where('resource_id', $resource->id)->sole();
    $file = ChapterAudioFile::query()->find(1_000_253_059);

    expect($report->created)->toBe(1)
        ->and($report->files)->toBe(3)
        ->and($report->hasProblems())->toBeFalse()
        ->and($resource->name)->toBe('Fixture Reciter 253')
        ->and($resource->name_ar)->toBe('قارئ تجريبي 253')
        ->and($resource->version)->toBe(1)
        ->and($resource->changes_floor_version)->toBe(1)
        ->and($resource->is_active)->toBeTrue()
        ->and($resource->import_fingerprint)->not->toBeNull()
        ->and($recitation->reciter_name)->toBe('Fixture Reciter 253')
        ->and($recitation->reciter_name_ar)->toBe('قارئ تجريبي 253')
        ->and($recitation->style)->toBe('Murattal')
        ->and($recitation->qirat)->toBe('Hafs')
        ->and($recitation->has_word_segments)->toBeFalse()
        ->and(ChapterAudioFile::query()->where('recitation_id', $recitation->id)->pluck('chapter_id')->all())->toEqualCanonicalizing([1, 2, 59])
        ->and($file->chapter_id)->toBe(59)
        ->and($file->audio_url)->toBe(mp3QuranFileUrl(253, 59))
        ->and($file->size_bytes)->toBe(1059)
        ->and($file->duration_ms)->toBe(60_059)
        ->and($file->format)->toBe('mp3');
    Event::assertDispatchedTimes(ResourceContentChanged::class, 1);
});

it('is idempotent: a second run changes nothing and bumps nothing', function (): void {
    Event::fake([ResourceContentChanged::class]);
    mp3QuranTestManifest([mp3QuranTestMoshaf(253, [1, 2, 59])]);
    mp3QuranImport();
    $before = mp3QuranResource(253);

    $report = mp3QuranImport();
    $after = mp3QuranResource(253);

    expect($report->unchanged)->toBe(1)
        ->and($report->created + $report->updated)->toBe(0)
        ->and($after->version)->toBe($before->version)
        ->and($after->changes_floor_version)->toBe($before->changes_floor_version)
        ->and($after->synced_at?->toIso8601String())->toBe($before->synced_at?->toIso8601String())
        ->and(ChapterAudioFile::query()->count())->toBe(3);
    Event::assertDispatchedTimes(ResourceContentChanged::class, 1);
});

it('bumps once and dispatches once when a file size changes', function (): void {
    Event::fake([ResourceContentChanged::class]);
    $moshaf = mp3QuranTestMoshaf(253, [1, 2, 59]);
    mp3QuranTestManifest([$moshaf]);
    mp3QuranImport();

    $moshaf['files'][1]['bytes'] = 9999;
    mp3QuranTestManifest([$moshaf]);
    $report = mp3QuranImport();

    expect($report->updated)->toBe(1)
        ->and(mp3QuranResource(253)->version)->toBe(2)
        ->and(mp3QuranResource(253)->changes_floor_version)->toBe(2)
        ->and(ChapterAudioFile::query()->find(1_000_253_002)->size_bytes)->toBe(9999);
    Event::assertDispatchedTimes(ResourceContentChanged::class, 2);
});

it('bumps when the style changes and when the name changes', function (): void {
    Event::fake([ResourceContentChanged::class]);
    $moshaf = mp3QuranTestMoshaf(253, [1, 2]);
    mp3QuranTestManifest([$moshaf]);
    mp3QuranImport();

    $moshaf['moshaf_name'] = 'حفص عن عاصم - مجود';
    mp3QuranTestManifest([$moshaf]);
    mp3QuranImport();

    expect(Recitation::query()->where('resource_id', mp3QuranResource(253)->id)->value('style'))->toBe('Mujawwad')
        ->and(mp3QuranResource(253)->version)->toBe(2);

    $moshaf['name_en'] = 'Fixture Reciter Renamed';
    mp3QuranTestManifest([$moshaf]);
    mp3QuranImport();

    expect(mp3QuranResource(253)->name)->toBe('Fixture Reciter Renamed')
        ->and(mp3QuranResource(253)->version)->toBe(3);
    Event::assertDispatchedTimes(ResourceContentChanged::class, 3);
});

it('with --defer-pack bumps and writes but dispatches no event', function (): void {
    Event::fake([ResourceContentChanged::class]);
    mp3QuranTestManifest([mp3QuranTestMoshaf(253, [1, 2])]);

    mp3QuranImport(deferPack: true);

    expect(mp3QuranResource(253)->version)->toBe(1)
        ->and(ChapterAudioFile::query()->count())->toBe(2);
    Event::assertNotDispatched(ResourceContentChanged::class);
});

it('with --dry-run writes nothing', function (): void {
    Event::fake([ResourceContentChanged::class]);
    mp3QuranTestManifest([mp3QuranTestMoshaf(253, [1, 2])]);

    $report = mp3QuranImport(dryRun: true);

    expect($report->created)->toBe(1)
        ->and(mp3QuranResource(253))->toBeNull()
        ->and(ChapterAudioFile::query()->count())->toBe(0);
    Event::assertNotDispatched(ResourceContentChanged::class);
});

it('imports only the surahs it has when a moshaf lacks some, and counts the listed missing one', function (): void {
    mp3QuranTestManifest([mp3QuranTestMoshaf(253, [1, 2], ['surah_list' => [1, 2, 3]])]);

    $report = mp3QuranImport();

    expect($report->surahsWithoutFile)->toBe(1)
        ->and(ChapterAudioFile::query()->where('chapter_id', 3)->exists())->toBeFalse()
        ->and(ChapterAudioFile::query()->count())->toBe(2);
});

it('removes the file row of a surah that left the manifest', function (): void {
    mp3QuranTestManifest([mp3QuranTestMoshaf(253, [1, 2, 59])]);
    mp3QuranImport();

    mp3QuranTestManifest([mp3QuranTestMoshaf(253, [1, 2])]);
    mp3QuranImport();

    expect(ChapterAudioFile::query()->find(1_000_253_059))->toBeNull()
        ->and(mp3QuranResource(253)->version)->toBe(2);
});

it('hides a duplicate: imported inactive with the reason and no event, and not served by the manifest endpoint', function (): void {
    Event::fake([ResourceContentChanged::class]);
    config(['quran.mp3quran_duplicates' => [253 => '7']]);
    mp3QuranTestManifest([mp3QuranTestMoshaf(253, [1, 2]), mp3QuranTestMoshaf(254, [1, 2])]);

    $report = mp3QuranImport();
    $this->artisan('content:ensure-packs')->assertSuccessful();

    $hidden = mp3QuranResource(253);
    $ids = collect($this->getJson('/api/v1/content/manifest')->json('resources'))->pluck('id')->all();

    expect($report->hidden)->toBe(1)
        ->and($hidden->is_active)->toBeFalse()
        ->and($hidden->unavailable_reason)->toBe('duplicate_of_qf:7')
        ->and($hidden->recitation)->not->toBeNull()
        ->and($ids)->not->toContain($hidden->id)
        ->and($ids)->toContain(mp3QuranResource(254)->id);
    Event::assertDispatchedTimes(ResourceContentChanged::class, 1);
});

it('holds a moshaf: imported inactive with reason held, its files kept, no event, and not served by the manifest endpoint', function (): void {
    Event::fake([ResourceContentChanged::class]);
    config(['quran.mp3quran_held_moshafs' => [253]]);
    mp3QuranTestManifest([mp3QuranTestMoshaf(253, [1, 2]), mp3QuranTestMoshaf(254, [1, 2])]);

    $report = mp3QuranImport();
    $this->artisan('content:ensure-packs')->assertSuccessful();

    $held = mp3QuranResource(253);
    $ids = collect($this->getJson('/api/v1/content/manifest')->json('resources'))->pluck('id')->all();

    expect($report->hidden)->toBe(1)
        ->and($held->is_active)->toBeFalse()
        ->and($held->unavailable_reason)->toBe('held')
        ->and(ChapterAudioFile::query()->where('recitation_id', $held->recitation->id)->count())->toBe(2)
        ->and($ids)->not->toContain($held->id)
        ->and($ids)->toContain(mp3QuranResource(254)->id);
    Event::assertDispatchedTimes(ResourceContentChanged::class, 1);
});

it('does not build a pack for a held moshaf', function (): void {
    Event::fake([ResourceContentChanged::class]);
    config(['quran.mp3quran_held_moshafs' => [253]]);
    mp3QuranTestManifest([mp3QuranTestMoshaf(253, [1, 2])]);

    mp3QuranImport();
    $this->artisan('content:ensure-packs')->assertSuccessful();

    expect(ContentPack::query()->where('resource_id', mp3QuranResource(253)->id)->exists())->toBeFalse();
    Event::assertNotDispatched(ResourceContentChanged::class);
});

it('reactivates a held moshaf once its id leaves the held list, with a version bump and one event', function (): void {
    Event::fake([ResourceContentChanged::class]);
    config(['quran.mp3quran_held_moshafs' => [253]]);
    mp3QuranTestManifest([mp3QuranTestMoshaf(253, [1, 2])]);
    mp3QuranImport();
    Event::assertNotDispatched(ResourceContentChanged::class);

    config(['quran.mp3quran_held_moshafs' => []]);
    mp3QuranImport();

    expect(mp3QuranResource(253)->is_active)->toBeTrue()
        ->and(mp3QuranResource(253)->unavailable_reason)->toBeNull()
        ->and(mp3QuranResource(253)->version)->toBe(2);
    Event::assertDispatchedTimes(ResourceContentChanged::class, 1);
});

it('converges from the local pilot rows', function (): void {
    Event::fake([ResourceContentChanged::class]);
    $source = ContentSource::query()->where('code', 'mp3quran')->value('id');
    $pilot = Resource::query()->create([
        'source_id' => $source,
        'group' => ResourceGroup::ChapterRecitations,
        'source_key' => '253',
        'name' => 'Pilot',
        'version' => 4,
        'changes_floor_version' => 4,
        'is_active' => true,
    ]);
    $pilotRecitation = Recitation::factory()->create(['resource_id' => $pilot->id, 'has_word_segments' => true]);
    foreach ([[1_000_253_002, 2], [1_000_253_059, 59]] as [$fileId, $chapter]) {
        ChapterAudioFile::query()->create([
            'id' => $fileId,
            'recitation_id' => $pilotRecitation->id,
            'chapter_id' => $chapter,
            'audio_url' => 'https://audio.taybah-app.com/audio/mp3quran/253/old.mp3',
            'size_bytes' => 1,
            'duration_ms' => 1,
            'format' => 'mp3',
        ]);
        RecitationTiming::query()->create([
            'audio_file_id' => $fileId,
            'verse_id' => 1,
            'verse_key' => $chapter.':1',
            'start_ms' => 0,
            'end_ms' => 500,
            'segments' => [[1, 0, 500]],
        ]);
    }
    mp3QuranTestManifest([mp3QuranTestMoshaf(253, [2, 59])]);

    mp3QuranImport();

    $resource = mp3QuranResource(253);
    expect($resource->id)->toBe($pilot->id)
        ->and($resource->version)->toBe(5)
        ->and($resource->changes_floor_version)->toBe(5)
        ->and($resource->import_fingerprint)->not->toBeNull()
        ->and(Recitation::query()->where('resource_id', $resource->id)->value('id'))->toBe($pilotRecitation->id)
        ->and($pilotRecitation->fresh()->has_word_segments)->toBeFalse()
        ->and(RecitationTiming::query()->whereIn('audio_file_id', [1_000_253_002, 1_000_253_059])->count())->toBe(0)
        ->and(ChapterAudioFile::query()->find(1_000_253_002)->audio_url)->toBe(mp3QuranFileUrl(253, 2));
    Event::assertDispatchedTimes(ResourceContentChanged::class, 1);

    mp3QuranImport();

    expect(mp3QuranResource(253)->version)->toBe(5);
    Event::assertDispatchedTimes(ResourceContentChanged::class, 1);
});

it('keeps has_word_segments true on re-import when a served Taybah set has segments', function (): void {
    mp3QuranTestManifest([mp3QuranTestMoshaf(253, [1, 2, 59])]);
    mp3QuranImport();
    $recitation = Recitation::query()->where('resource_id', mp3QuranResource(253)->id)->sole();
    TaybahTimingSet::factory()->create([
        'recitation_id' => $recitation->id,
        'chapter_id' => 59,
        'audio_url' => mp3QuranFileUrl(253, 59),
    ]);
    TaybahRecitationTiming::factory()->create(['recitation_id' => $recitation->id, 'chapter_id' => 59, 'verse_id' => 1]);
    app(RecitationSegmentsFlagService::class)->refresh($recitation->id);
    expect($recitation->fresh()->has_word_segments)->toBeTrue();

    $moshaf = mp3QuranTestMoshaf(253, [1, 2, 59]);
    $moshaf['files'][0]['bytes'] = 4242;
    mp3QuranTestManifest([$moshaf]);
    mp3QuranImport();

    expect($recitation->fresh()->has_word_segments)->toBeTrue()
        ->and(mp3QuranResource(253)->version)->toBe(2);
});

it('deactivates a moshaf removed from the manifest without deleting rows, and reactivates it when listed again', function (): void {
    Event::fake([ResourceContentChanged::class]);
    mp3QuranTestManifest([mp3QuranTestMoshaf(253, [1, 2]), mp3QuranTestMoshaf(254, [1, 2])]);
    mp3QuranImport();
    Event::assertDispatchedTimes(ResourceContentChanged::class, 2);

    mp3QuranTestManifest([mp3QuranTestMoshaf(254, [1, 2])]);
    $report = mp3QuranImport();

    $removed = mp3QuranResource(253);
    expect($report->deactivated)->toBe(1)
        ->and($removed->is_active)->toBeFalse()
        ->and($removed->unavailable_reason)->toBe('removed_from_manifest')
        ->and($removed->version)->toBe(2)
        ->and(ChapterAudioFile::query()->where('recitation_id', $removed->recitation->id)->count())->toBe(2);
    Event::assertDispatchedTimes(ResourceContentChanged::class, 2);

    mp3QuranTestManifest([mp3QuranTestMoshaf(253, [1, 2]), mp3QuranTestMoshaf(254, [1, 2])]);
    mp3QuranImport();

    expect(mp3QuranResource(253)->is_active)->toBeTrue()
        ->and(mp3QuranResource(253)->unavailable_reason)->toBeNull();
    Event::assertDispatchedTimes(ResourceContentChanged::class, 3);
});

it('refuses a missing, malformed, empty or wrong-schema manifest and writes nothing', function (): void {
    $path = mp3QuranTestManifest([mp3QuranTestMoshaf(253, [1, 2])]);
    mp3QuranImport();

    $cases = [
        'missing' => fn () => File::delete($path),
        'malformed' => fn () => File::put($path, '{not json'),
        'empty' => fn () => File::put($path, json_encode(['schema' => 1, 'source' => 'mp3quran', 'public_base' => 'https://audio.example.test', 'moshafs' => []])),
        'wrong schema' => fn () => File::put($path, json_encode(['schema' => 2, 'source' => 'mp3quran', 'public_base' => 'https://audio.example.test', 'moshafs' => [mp3QuranTestMoshaf(254, [1])]])),
    ];

    foreach ($cases as $corrupt) {
        $corrupt();

        expect(fn () => mp3QuranImport())->toThrow(Mp3QuranManifestException::class);
    }

    expect(mp3QuranResource(253)->is_active)->toBeTrue()
        ->and(mp3QuranResource(254))->toBeNull();
});

it('skips an invalid moshaf, imports the others, and leaves the invalid one untouched', function (): void {
    mp3QuranTestManifest([mp3QuranTestMoshaf(254, [1, 2])]);
    mp3QuranImport();
    $before = mp3QuranResource(254);

    $badKey = mp3QuranTestMoshaf(254, [1, 2]);
    $badKey['files'][0]['key'] = 'audio/mp3quran/254/001-0000000000000000.mp3';
    $duplicateSurah = mp3QuranTestMoshaf(255, [1, 1]);
    $wrongUrl = mp3QuranTestMoshaf(256, [1]);
    $wrongUrl['files'][0]['url'] = 'https://elsewhere.example.test/'.$wrongUrl['files'][0]['key'];
    $wrongRiwayah = mp3QuranTestMoshaf(257, [1], ['riwayah' => 'ورش عن نافع', 'moshaf_name' => 'ورش عن نافع - مرتل']);
    $surah115 = mp3QuranTestMoshaf(258, [115]);
    $emptyFiles = mp3QuranTestMoshaf(259, [1], ['files' => []]);

    mp3QuranTestManifest([
        mp3QuranTestMoshaf(253, [1, 2]),
        $badKey,
        $duplicateSurah,
        $wrongUrl,
        $wrongRiwayah,
        $surah115,
        $emptyFiles,
    ]);

    $report = mp3QuranImport();

    expect($report->hasProblems())->toBeTrue()
        ->and(collect($report->skipped)->pluck('moshaf_id')->all())->toEqualCanonicalizing([254, 255, 256, 257, 258, 259])
        ->and(mp3QuranResource(253))->not->toBeNull()
        ->and(mp3QuranResource(255))->toBeNull()
        ->and(mp3QuranResource(254)->version)->toBe($before->version)
        ->and(mp3QuranResource(254)->import_fingerprint)->toBe($before->import_fingerprint)
        ->and(mp3QuranResource(254)->is_active)->toBeTrue();
});

it('exits non-zero from the command and names an invalid moshaf', function (): void {
    mp3QuranTestManifest([mp3QuranTestMoshaf(253, [1]), mp3QuranTestMoshaf(254, [1], ['riwayah' => 'ورش عن نافع'])]);

    $this->artisan('mp3quran:import')
        ->expectsOutputToContain('moshaf 254')
        ->assertFailed();
});

it('ignores every QF config keyed by source_key', function (): void {
    $ids = [5, 158, 168, 174, (int) config('quran.default_recitation')];
    mp3QuranTestManifest(array_map(static fn (int $id): array => mp3QuranTestMoshaf($id, [1]), $ids));

    $report = mp3QuranImport();
    $this->artisan('content:ensure-packs')->assertSuccessful();

    $flags = collect($this->getJson('/api/v1/content/manifest')->json('resources'))
        ->mapWithKeys(fn (array $entry): array => [$entry['id'] => $entry['is_default']])
        ->all();

    expect($report->created)->toBe(count($ids))
        ->and($flags)->toHaveCount(count($ids))
        ->and(array_filter($flags))->toBeEmpty();
});

it('builds a pack for an imported recitation through content:ensure-packs', function (): void {
    Event::fake([ResourceContentChanged::class]);
    mp3QuranTestManifest([mp3QuranTestMoshaf(253, [1, 2])]);
    mp3QuranImport(deferPack: true);
    $resource = mp3QuranResource(253);

    $this->artisan('content:ensure-packs')
        ->expectsOutputToContain('OK '.$resource->id)
        ->assertSuccessful();

    expect(ContentPack::query()->where('resource_id', $resource->id)->exists())->toBeTrue();
});

it('reads no credential and makes no network call', function (): void {
    $root = app_path('Domains/Content');
    $files = array_merge(
        glob($root.'/Mp3Quran/*.php') ?: [],
        [
            $root.'/Services/Mp3QuranImporter.php',
            $root.'/Services/TaybahTimingImporter.php',
            $root.'/Console/ImportMp3QuranCommand.php',
            $root.'/Console/ImportRecitationTimingsCommand.php',
        ],
    );

    expect($files)->not->toBeEmpty();

    foreach ($files as $file) {
        $source = (string) file_get_contents($file);

        foreach (['env(', 'Storage::', 'R2_', 'AWS_'] as $forbidden) {
            expect(str_contains($source, $forbidden))->toBeFalse($file.' contains '.$forbidden);
        }
    }

    mp3QuranTestManifest([mp3QuranTestMoshaf(253, [1])]);
    mp3QuranImport();
    Http::assertNothingSent();
});
