<?php

declare(strict_types=1);

require_once __DIR__.'/../../Support/Mp3QuranTestManifest.php';

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Models\ChapterAudioFile;
use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Mp3Quran\Mp3QuranFileId;
use App\Domains\Content\Mp3Quran\ReciterSource;
use App\Domains\Content\Packs\PackSchema;
use App\Domains\Content\Services\Mp3QuranImporter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Http::preventStrayRequests();
    config(['quran.mp3quran_held_moshafs' => []]);
});

/**
 * @param  array<string, mixed>  $range  first_ayah and last_ayah for surah 23
 */
function rangeMoshaf(int $id, array $range): array
{
    $moshaf = mp3QuranTestMoshaf($id, [1, 23]);
    $moshaf['files'][1] = array_merge($moshaf['files'][1], $range);

    return $moshaf;
}

function rangeResource(int $id): Resource
{
    return Resource::query()
        ->where('source_id', ContentSource::query()->where('code', 'mp3quran')->value('id'))
        ->where('group', ResourceGroup::ChapterRecitations)
        ->where('source_key', (string) $id)
        ->sole();
}

it('stores null first and last ayah by default', function (): void {
    mp3QuranTestManifest([mp3QuranTestMoshaf(301, [1, 23])]);

    app(Mp3QuranImporter::class)->import();

    expect(ChapterAudioFile::query()->pluck('first_ayah')->filter()->all())->toBe([])
        ->and(ChapterAudioFile::query()->pluck('last_ayah')->filter()->all())->toBe([]);
});

it('stores the recorded range of a partial surah and only on that file', function (): void {
    mp3QuranTestManifest([rangeMoshaf(302, ['first_ayah' => 1, 'last_ayah' => 22])]);

    $report = app(Mp3QuranImporter::class)->import();

    $partial = ChapterAudioFile::query()->where('chapter_id', 23)->sole();
    $whole = ChapterAudioFile::query()->where('chapter_id', 1)->sole();

    expect($report->hasProblems())->toBeFalse()
        ->and([$partial->first_ayah, $partial->last_ayah])->toBe([1, 22])
        ->and([$whole->first_ayah, $whole->last_ayah])->toBe([null, null]);
});

it('clears a range that the manifest later drops', function (): void {
    mp3QuranTestManifest([rangeMoshaf(303, ['first_ayah' => 5, 'last_ayah' => 30])]);
    app(Mp3QuranImporter::class)->import();

    mp3QuranTestManifest([mp3QuranTestMoshaf(303, [1, 23])]);
    $report = app(Mp3QuranImporter::class)->import();

    $partial = ChapterAudioFile::query()->where('chapter_id', 23)->sole();

    expect($report->updated)->toBe(1)
        ->and([$partial->first_ayah, $partial->last_ayah])->toBe([null, null]);
});

it('refuses an invalid range and skips that moshaf', function (array $range): void {
    mp3QuranTestManifest([rangeMoshaf(304, $range)]);

    $report = app(Mp3QuranImporter::class)->import();

    expect($report->hasProblems())->toBeTrue()
        ->and(collect($report->skipped)->pluck('moshaf_id')->all())->toBe([304])
        ->and(ChapterAudioFile::query()->count())->toBe(0);
})->with([
    'first after last' => [['first_ayah' => 10, 'last_ayah' => 9]],
    'first below 1' => [['first_ayah' => 0, 'last_ayah' => 10]],
    'last past the surah (23 has 118 ayahs)' => [['first_ayah' => 1, 'last_ayah' => 119]],
    'shorter than 3 ayahs' => [['first_ayah' => 4, 'last_ayah' => 5]],
    'only one key' => [['first_ayah' => 1]],
    'not an int' => [['first_ayah' => '1', 'last_ayah' => 10]],
]);

it('keeps the fingerprint of a moshaf without ranges exactly as before the field existed', function (): void {
    mp3QuranTestManifest([mp3QuranTestMoshaf(305, [1, 23])]);
    app(Mp3QuranImporter::class)->import();

    $files = [];

    foreach (ChapterAudioFile::query()->orderBy('chapter_id')->get() as $file) {
        $files[] = [Mp3QuranFileId::for(305, $file->chapter_id, ReciterSource::mp3quran()), $file->chapter_id, $file->audio_url, $file->size_bytes, $file->duration_ms, 'mp3'];
    }

    $expected = hash('sha256', json_encode([
        'reciter_name' => 'Fixture Reciter 305',
        'reciter_name_ar' => 'قارئ تجريبي 305',
        'style' => 'Murattal',
        'qirat' => 'Hafs',
        'files' => $files,
    ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

    expect(rangeResource(305)->import_fingerprint)->toBe($expected);
});

it('changes the fingerprint when a range is added', function (): void {
    mp3QuranTestManifest([mp3QuranTestMoshaf(306, [1, 23])]);
    app(Mp3QuranImporter::class)->import();
    $before = rangeResource(306)->import_fingerprint;

    mp3QuranTestManifest([rangeMoshaf(306, ['first_ayah' => 1, 'last_ayah' => 22])]);
    app(Mp3QuranImporter::class)->import();

    expect(rangeResource(306)->import_fingerprint)->not->toBe($before);
});

it('puts both range columns, nullable, in the pack table', function (): void {
    $columns = collect(PackSchema::chapterAudioFiles()->columns)->keyBy('name');

    expect($columns->has('first_ayah'))->toBeTrue()
        ->and($columns->has('last_ayah'))->toBeTrue()
        ->and($columns['first_ayah']->nullable)->toBeTrue()
        ->and($columns['last_ayah']->nullable)->toBeTrue();
});
