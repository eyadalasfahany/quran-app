<?php

declare(strict_types=1);

require_once __DIR__.'/../../Support/Way2QuranTestManifest.php';
require_once __DIR__.'/../../Support/Mp3QuranTestManifest.php';

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Events\ResourceContentChanged;
use App\Domains\Content\Models\ChapterAudioFile;
use App\Domains\Content\Models\ContentPack;
use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Recitation;
use App\Domains\Content\Models\Resource;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

/*
| The way2quran:import command (ADR 0074). Every assertion on the import goes through the command, so a passing run
| proves the command builds the importer and the manifest with the way2quran profile. Fixtures are placeholders.
*/

/** The 54 Hafs surahs listed for Hossam El Din Ebadi (ADR 0074 facts). Numbers only. */
const WAY2QURAN_TEST_PARTIAL_SURAHS = [1, 12, 14, 15, 17, 18, 19, 31, 32, 36, 38, 44, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 72, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 93, 99];

beforeEach(function (): void {
    Http::preventStrayRequests();
    Event::fake([ResourceContentChanged::class]);
    config([
        'quran.way2quran_released_reciters' => [],
        'quran.mp3quran_held_moshafs' => [],
        'quran.mp3quran_duplicates' => [],
    ]);
});

function way2QuranResource(int $reciterId): ?Resource
{
    return Resource::query()
        ->where('source_id', ContentSource::query()->where('code', 'way2quran')->value('id'))
        ->where('group', ResourceGroup::ChapterRecitations)
        ->where('source_key', (string) $reciterId)
        ->first();
}

/**
 * Runs the command and returns its exit code and output.
 *
 * @param  array<string, mixed>  $options
 * @return array{0: int, 1: string}
 */
function way2QuranRun(array $options = []): array
{
    $code = Artisan::call('way2quran:import', $options);

    return [$code, Artisan::output()];
}

/**
 * The number in the command's table row with this label (the report's metric). -1 when the row is missing.
 */
function way2QuranCount(string $output, string $label): int
{
    return preg_match('/\|\s*'.preg_quote($label, '/').'\s*\|\s*(\d+)\s*\|/', $output, $matches) === 1
        ? (int) $matches[1]
        : -1;
}

it('imports a reciter hidden with reason held, its files kept, and not served by the manifest endpoint', function (): void {
    way2QuranTestManifest([way2QuranTestReciter(1, [1, 2])]);

    [$code, $output] = way2QuranRun();
    $this->artisan('content:ensure-packs')->assertSuccessful();

    $resource = way2QuranResource(1);
    $ids = collect($this->getJson('/api/v1/content/manifest')->json('resources'))->pluck('id')->all();

    expect($code)->toBe(0)
        ->and(way2QuranCount($output, 'hidden (not released)'))->toBe(1)
        ->and($resource)->not->toBeNull()
        ->and($resource->is_active)->toBeFalse()
        ->and($resource->unavailable_reason)->toBe('held')
        ->and($resource->name)->toBe('Fixture Way2Quran Reciter 1')
        ->and(Recitation::query()->where('resource_id', $resource->id)->sole()->style)->toBe('Murattal')
        ->and(ChapterAudioFile::query()->where('recitation_id', $resource->recitation->id)->count())->toBe(2)
        ->and($ids)->not->toContain($resource->id);
    Event::assertNotDispatched(ResourceContentChanged::class);
});

it('imports a released reciter active, with a version bump, one event and a pack served by the manifest endpoint', function (): void {
    config(['quran.way2quran_released_reciters' => [1]]);
    way2QuranTestManifest([way2QuranTestReciter(1, [1, 2])]);

    [$code] = way2QuranRun();
    $this->artisan('content:ensure-packs')->assertSuccessful();

    $resource = way2QuranResource(1);
    $ids = collect($this->getJson('/api/v1/content/manifest')->json('resources'))->pluck('id')->all();

    expect($code)->toBe(0)
        ->and($resource->is_active)->toBeTrue()
        ->and($resource->unavailable_reason)->toBeNull()
        ->and($resource->version)->toBe(1)
        ->and(ContentPack::query()->where('resource_id', $resource->id)->exists())->toBeTrue()
        ->and($ids)->toContain($resource->id);
    Event::assertDispatchedTimes(ResourceContentChanged::class, 1);
});

it('is idempotent: a second run writes nothing and bumps nothing', function (): void {
    config(['quran.way2quran_released_reciters' => [1]]);
    way2QuranTestManifest([way2QuranTestReciter(1, [1, 2])]);
    way2QuranRun();
    $before = way2QuranResource(1);

    [$code, $output] = way2QuranRun();
    expect($code)->toBe(0);
    $after = way2QuranResource(1);

    expect(way2QuranCount($output, 'unchanged'))->toBe(1)
        ->and(way2QuranCount($output, 'created'))->toBe(0)
        ->and(way2QuranCount($output, 'updated'))->toBe(0)
        ->and($after->version)->toBe($before->version)
        ->and($after->changes_floor_version)->toBe($before->changes_floor_version)
        ->and($after->synced_at?->toIso8601String())->toBe($before->synced_at?->toIso8601String());
    Event::assertDispatchedTimes(ResourceContentChanged::class, 1);
});

it('gives way2quran file ids in the 2e9 range, never equal to an mp3quran id', function (): void {
    way2QuranTestManifest([way2QuranTestReciter(1, [1, 2])]);
    way2QuranRun();
    $mp3 = mp3QuranTestManifest([mp3QuranTestMoshaf(1, [1, 2])]);
    config(['quran.mp3quran_manifest_path' => $mp3]);
    Artisan::call('mp3quran:import');

    $wayIds = ChapterAudioFile::query()
        ->where('recitation_id', way2QuranResource(1)->recitation->id)
        ->pluck('id')
        ->sort()
        ->values()
        ->all();

    expect($wayIds)->toBe([2_000_001_001, 2_000_001_002])
        ->and(ChapterAudioFile::query()->whereIn('id', [1_000_001_001, 1_000_001_002])->count())->toBe(2)
        ->and(array_intersect($wayIds, [1_000_001_001, 1_000_001_002]))->toBeEmpty();
});

it('lists no surah without a file for a 54-surah reciter or a 114-surah reciter', function (): void {
    config(['quran.way2quran_released_reciters' => [1, 2]]);
    $partial = WAY2QURAN_TEST_PARTIAL_SURAHS;
    $all = range(1, 114);
    expect(count($partial))->toBe(54);
    way2QuranTestManifest([way2QuranTestReciter(1, $partial), way2QuranTestReciter(2, $all)]);

    [$code, $output] = way2QuranRun();

    expect($code)->toBe(0)
        ->and(way2QuranCount($output, 'surahs listed without a file'))->toBe(0)
        ->and(way2QuranCount($output, 'files'))->toBe(54 + 114)
        ->and(ChapterAudioFile::query()->where('recitation_id', way2QuranResource(1)->recitation->id)->count())->toBe(54)
        ->and(ChapterAudioFile::query()->where('recitation_id', way2QuranResource(2)->recitation->id)->count())->toBe(114);
});

it('counts a listed surah that has no file and imports the rest', function (): void {
    way2QuranTestManifest([way2QuranTestReciter(1, [1, 2], ['surah_list' => [1, 2, 3]])]);

    [$code, $output] = way2QuranRun();
    expect($code)->toBe(0);

    expect(way2QuranCount($output, 'surahs listed without a file'))->toBe(1)
        ->and(ChapterAudioFile::query()->where('chapter_id', 3)->exists())->toBeFalse()
        ->and(ChapterAudioFile::query()->count())->toBe(2);
});

it('refuses a key under audio/mp3quran/ and imports the other reciters', function (): void {
    config(['quran.way2quran_released_reciters' => [1, 2]]);
    $bad = way2QuranTestReciter(1, [1]);
    $bad['files'][0]['key'] = 'audio/mp3quran/1/001-0000000000000000.mp3';
    way2QuranTestManifest([$bad, way2QuranTestReciter(2, [1])]);

    [$code, $output] = way2QuranRun();

    expect($code)->toBe(1)
        ->and($output)->toContain('reciter 1')
        ->and(way2QuranResource(1))->toBeNull()
        ->and(way2QuranResource(2))->not->toBeNull()
        ->and(way2QuranResource(2)->is_active)->toBeTrue();
});

it('refuses a manifest whose source is mp3quran and writes nothing', function (): void {
    config(['quran.way2quran_released_reciters' => [1]]);
    way2QuranTestManifest([way2QuranTestReciter(1, [1])], 'mp3quran');

    [$code, $output] = way2QuranRun();

    expect($code)->toBe(1)
        ->and($output)->toContain('wrong schema or source')
        ->and(way2QuranResource(1))->toBeNull()
        ->and(ChapterAudioFile::query()->count())->toBe(0);
});

it('refuses a missing manifest and names the Way2Quran path', function (): void {
    config(['quran.way2quran_manifest_path' => base_path('storage/framework/testing/no-such-way2quran-manifest.json')]);

    [$code, $output] = way2QuranRun();

    expect($code)->toBe(1)
        ->and($output)->toContain('The Way2Quran manifest is missing');
});

it('writes nothing with --dry-run', function (): void {
    config(['quran.way2quran_released_reciters' => [1]]);
    way2QuranTestManifest([way2QuranTestReciter(1, [1, 2])]);

    [$code, $output] = way2QuranRun(['--dry-run' => true]);

    expect($code)->toBe(0)
        ->and($output)->toContain('Dry run: nothing written.')
        ->and(way2QuranResource(1))->toBeNull()
        ->and(ChapterAudioFile::query()->count())->toBe(0);
    Event::assertNotDispatched(ResourceContentChanged::class);
});

it('ignores the mp3quran held and duplicate lists: an unreleased reciter is held, never a duplicate', function (): void {
    config([
        'quran.mp3quran_duplicates' => [1 => '7'],
        'quran.mp3quran_held_moshafs' => [1],
        'quran.way2quran_released_reciters' => [],
    ]);
    way2QuranTestManifest([way2QuranTestReciter(1, [1])]);

    way2QuranRun();

    expect(way2QuranResource(1)->unavailable_reason)->toBe('held')
        ->and(way2QuranResource(1)->is_active)->toBeFalse();
});

it('keeps a reciter hidden when the released list names only other ids', function (): void {
    config(['quran.way2quran_released_reciters' => [2]]);
    way2QuranTestManifest([way2QuranTestReciter(1, [1])]);

    way2QuranRun();

    expect(way2QuranResource(1)->is_active)->toBeFalse()
        ->and(way2QuranResource(1)->unavailable_reason)->toBe('held');
});

it('deactivates a reciter removed from the manifest, touching only way2quran rows, and leaves mp3quran rows alone', function (): void {
    config(['quran.way2quran_released_reciters' => [1, 2]]);
    way2QuranTestManifest([way2QuranTestReciter(1, [1]), way2QuranTestReciter(2, [1])]);
    way2QuranRun();
    mp3QuranTestManifest([mp3QuranTestMoshaf(253, [1, 2])]);
    Artisan::call('mp3quran:import');
    $mp3Before = Resource::query()->where('source_key', '253')->firstOrFail();

    // Each helper call points the config at its own file, so the way2quran manifest is written again here.
    way2QuranTestManifest([way2QuranTestReciter(1, [1])]);
    [$code, $output] = way2QuranRun();
    expect($code)->toBe(0);

    expect(way2QuranCount($output, 'deactivated'))->toBe(1)
        ->and(way2QuranResource(2)->is_active)->toBeFalse()
        ->and(way2QuranResource(2)->unavailable_reason)->toBe('removed_from_manifest')
        ->and(way2QuranResource(1)->is_active)->toBeTrue()
        ->and(Resource::query()->find($mp3Before->id)->is_active)->toBeTrue()
        ->and(Resource::query()->find($mp3Before->id)->version)->toBe($mp3Before->version);
});

it('leaves way2quran rows alone when an mp3quran import deactivates its own removed moshaf', function (): void {
    config(['quran.way2quran_released_reciters' => [1]]);
    way2QuranTestManifest([way2QuranTestReciter(1, [1])]);
    way2QuranRun();
    $way = way2QuranResource(1);
    mp3QuranTestManifest([mp3QuranTestMoshaf(254, [1])]);
    Artisan::call('mp3quran:import');
    mp3QuranTestManifest([mp3QuranTestMoshaf(255, [1])]);

    $code = Artisan::call('mp3quran:import');

    expect($code)->toBe(0)
        ->and(Resource::query()->where('source_key', '254')->firstOrFail()->unavailable_reason)->toBe('removed_from_manifest')
        ->and(way2QuranResource(1)->is_active)->toBeTrue()
        ->and(way2QuranResource(1)->version)->toBe($way->version)
        ->and(ChapterAudioFile::query()->where('recitation_id', $way->recitation->id)->count())->toBe(1);
});
