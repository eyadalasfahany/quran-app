<?php

declare(strict_types=1);

require_once __DIR__.'/../../Support/Mp3QuranTestManifest.php';

use App\Domains\Content\Enums\PermissionStatus;
use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Models\ChapterAudioFile;
use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Mushaf;
use App\Domains\Content\Models\Recitation;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Models\TaybahTimingSet;
use App\Domains\Content\Models\WordLayout;
use App\Support\QuranText\ChapterVerseCounts;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;

uses(RefreshDatabase::class);

/*
| Path options (--manifest, --path). Each test points the config at a location that does not exist, so a passing run
| can only come from the option being read. Fixtures are placeholders with no real content. Self-contained: the
| helpers here do not depend on other test files.
*/

/**
 * Writes a test manifest, then points config quran.mp3quran_manifest_path at a file that does not exist.
 *
 * @param  list<array<string, mixed>>  $moshafs
 */
function pathOptionManifest(array $moshafs): string
{
    $path = mp3QuranTestManifest($moshafs);
    config(['quran.mp3quran_manifest_path' => base_path('storage/framework/testing/no-such-manifest.json')]);

    return $path;
}

function pathOptionRelative(string $absolute): string
{
    return str_replace(base_path().'/', '', $absolute);
}

function pathOptionRoot(): string
{
    return storage_path('framework/testing/timings-option-'.uniqid());
}

function pathOptionUrl(): string
{
    return 'https://audio.example.test/fixture/mp3quran/253/108.mp3';
}

/**
 * A format 1 timing document for chapter 108 (3 ayahs, 2 segments each), matching the audio fixture below.
 *
 * @return array<string, mixed>
 */
function pathOptionDocument(): array
{
    $ayahs = [];

    for ($index = 0; $index < 3; $index++) {
        $start = $index * 1000;
        $ayahs[] = [
            'verse_key' => '108:'.($index + 1),
            'verse_id' => ChapterVerseCounts::firstVerseId(108) + $index,
            'start_ms' => $start,
            'end_ms' => $start + 1000,
            'segments' => [[1, $start, $start + 500], [2, $start + 500, $start + 1000]],
        ];
    }

    return [
        'format' => 1,
        'kind' => 'mp3quran',
        'recitation_key' => '253',
        'chapter_id' => 108,
        'audio' => [
            'url' => pathOptionUrl(),
            'bytes' => 1024,
            'sha256' => str_repeat('a', 64),
            'measured_duration_ms' => 3000,
        ],
        'source' => 'aligner',
        'tool_version' => '0.0.0-fixture',
        'models' => ['align' => ['id' => 'fixture-model', 'revision' => 'fixture'], 'asr' => null],
        'original_first_start_ms' => null,
        'ayahs' => $ayahs,
    ];
}

/**
 * Writes one timing file for mp3quran/253 chapter 108 under the given root.
 */
function pathOptionWriteTiming(string $root): void
{
    File::ensureDirectoryExists($root.'/mp3quran/253');
    file_put_contents(
        $root.'/mp3quran/253/108.json',
        json_encode(pathOptionDocument(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
    );
}

/**
 * The mp3quran/253 recitation with its chapter 108 audio file and word layouts (2 words per verse, 3 verses).
 */
function pathOptionTimingRecitation(): Recitation
{
    $source = ContentSource::query()->firstOrCreate(['code' => 'mp3quran'], [
        'name' => 'mp3quran',
        'licence_url' => 'https://example.test/licence',
        'attribution_ar' => 'إسناد',
        'attribution_en' => 'Attribution',
        'permission_status' => PermissionStatus::Granted,
    ]);
    $resource = Resource::factory()->create([
        'source_id' => $source->id,
        'group' => ResourceGroup::ChapterRecitations,
        'source_key' => '253',
        'version' => 3,
        'changes_floor_version' => 1,
        'is_active' => true,
    ]);
    $recitation = Recitation::factory()->create(['resource_id' => $resource->id]);

    ChapterAudioFile::factory()->create([
        'recitation_id' => $recitation->id,
        'chapter_id' => 108,
        'audio_url' => pathOptionUrl(),
        'size_bytes' => 1024,
    ]);

    if (! Mushaf::query()->whereKey(1)->exists()) {
        Mushaf::factory()->create(['id' => 1]);
    }

    for ($index = 0; $index < 3; $index++) {
        for ($position = 1; $position <= 2; $position++) {
            WordLayout::factory()->create([
                'mushaf_id' => 1,
                'verse_id' => ChapterVerseCounts::firstVerseId(108) + $index,
                'position_in_verse' => $position,
                'char_type' => 'word',
            ]);
        }
    }

    return $recitation;
}

afterEach(function (): void {
    foreach (File::glob(storage_path('framework/testing/timings-option-*')) as $folder) {
        File::deleteDirectory($folder);
    }
});

describe('mp3quran:import --manifest', function (): void {
    it('reads the manifest at the given absolute path, not the config path', function (): void {
        $path = pathOptionManifest([mp3QuranTestMoshaf(253, [1])]);

        expect(Artisan::call('mp3quran:import', ['--manifest' => $path, '--defer-pack' => true]))->toBe(0);

        $resource = Resource::query()->where('source_key', '253')->where('group', ResourceGroup::ChapterRecitations)->first();

        expect($resource)->toBeInstanceOf(Resource::class)
            ->and($resource->version)->toBe(1);
    });

    it('resolves a relative manifest path against the app root', function (): void {
        $path = pathOptionManifest([mp3QuranTestMoshaf(253, [1])]);

        expect(Artisan::call('mp3quran:import', ['--manifest' => pathOptionRelative($path), '--defer-pack' => true]))->toBe(0);
        expect(Resource::query()->where('source_key', '253')->exists())->toBeTrue();
    });

    it('exits 1 with the path when the manifest file is missing and writes nothing', function (): void {
        $missing = base_path('storage/framework/testing/absent-manifest.json');

        expect(Artisan::call('mp3quran:import', ['--manifest' => $missing, '--defer-pack' => true]))->toBe(1)
            ->and(Artisan::output())->toContain('The MP3Quran manifest is missing: '.$missing)
            ->and(Resource::query()->count())->toBe(0);
    });

    it('still reads the config path when the option is absent', function (): void {
        $path = mp3QuranTestManifest([mp3QuranTestMoshaf(253, [1])]);

        expect(Artisan::call('mp3quran:import', ['--defer-pack' => true]))->toBe(0)
            ->and(config('quran.mp3quran_manifest_path'))->toBe($path)
            ->and(Resource::query()->where('source_key', '253')->exists())->toBeTrue();
    });
});

describe('recitation-timings:import --path', function (): void {
    it('reads the timing folder given by the option, not the config path', function (): void {
        $root = pathOptionRoot();
        pathOptionWriteTiming($root);
        config(['quran.recitation_timings.path' => storage_path('framework/testing/no-such-timings')]);
        pathOptionTimingRecitation();

        expect(Artisan::call('recitation-timings:import', ['--path' => $root, '--defer-pack' => true]))->toBe(0)
            ->and(TaybahTimingSet::query()->count())->toBe(1);
    });

    it('resolves a relative folder path against the app root', function (): void {
        $root = pathOptionRoot();
        pathOptionWriteTiming($root);
        config(['quran.recitation_timings.path' => storage_path('framework/testing/no-such-timings')]);
        pathOptionTimingRecitation();

        expect(Artisan::call('recitation-timings:import', ['--path' => pathOptionRelative($root), '--defer-pack' => true]))->toBe(0)
            ->and(TaybahTimingSet::query()->count())->toBe(1);
    });

    it('exits 1 with the path when the folder is missing and writes nothing', function (): void {
        $missing = storage_path('framework/testing/absent-timings');
        pathOptionTimingRecitation();

        expect(Artisan::call('recitation-timings:import', ['--path' => $missing, '--defer-pack' => true]))->toBe(1)
            ->and(Artisan::output())->toContain('The timing folder is missing: '.$missing)
            ->and(TaybahTimingSet::query()->count())->toBe(0);
    });

    it('still reads the config path when the option is absent', function (): void {
        $root = pathOptionRoot();
        pathOptionWriteTiming($root);
        config(['quran.recitation_timings.path' => $root]);
        pathOptionTimingRecitation();

        expect(Artisan::call('recitation-timings:import', ['--defer-pack' => true]))->toBe(0)
            ->and(TaybahTimingSet::query()->count())->toBe(1);
    });
});
