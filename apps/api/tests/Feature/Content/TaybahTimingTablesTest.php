<?php

declare(strict_types=1);

use App\Domains\Content\Enums\TaybahTimingSource;
use App\Domains\Content\Models\ChapterAudioFile;
use App\Domains\Content\Models\Recitation;
use App\Domains\Content\Models\TaybahRecitationTiming;
use App\Domains\Content\Models\TaybahTimingSet;
use App\Domains\Content\Repositories\Contracts\ChapterAudioFileRepository;
use App\Domains\Content\Repositories\Contracts\TaybahTimingRepository;
use Illuminate\Database\QueryException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

function taybahMigration(string $name): object
{
    $files = glob(database_path('migrations/*_'.$name.'.php')) ?: [];

    expect($files)->toHaveCount(1);

    return require $files[0];
}

/**
 * @return array{recitation: Recitation, file: ChapterAudioFile}
 */
function taybahRecitationWithFile(string $audioUrl = 'https://audio.example.test/fixture/001.mp3'): array
{
    $recitation = Recitation::factory()->create();
    $file = ChapterAudioFile::factory()->create([
        'recitation_id' => $recitation->id,
        'chapter_id' => 1,
        'audio_url' => $audioUrl,
    ]);

    return ['recitation' => $recitation, 'file' => $file];
}

it('creates both Taybah tables with the columns in order', function (): void {
    expect(Schema::hasTable('taybah_timing_sets'))->toBeTrue()
        ->and(Schema::getColumnListing('taybah_timing_sets'))->toBe([
            'id',
            'recitation_id',
            'chapter_id',
            'audio_url',
            'size_bytes',
            'sha256',
            'measured_duration_ms',
            'source',
            'tool_version',
            'models',
            'original_first_start_ms',
            'digest',
            'imported_at',
        ])
        ->and(Schema::hasTable('taybah_recitation_timings'))->toBeTrue()
        ->and(Schema::getColumnListing('taybah_recitation_timings'))->toBe([
            'recitation_id',
            'chapter_id',
            'verse_id',
            'start_ms',
            'end_ms',
            'segments',
        ]);
});

it('rejects a timing row whose start is not before its end', function (): void {
    $recitation = Recitation::factory()->create();

    TaybahRecitationTiming::factory()->create([
        'recitation_id' => $recitation->id,
        'start_ms' => 1000,
        'end_ms' => 1000,
    ]);
})->throws(QueryException::class);

it('keeps one set per recitation and chapter', function (): void {
    $recitation = Recitation::factory()->create();

    TaybahTimingSet::factory()->create(['recitation_id' => $recitation->id, 'chapter_id' => 1]);

    TaybahTimingSet::factory()->create(['recitation_id' => $recitation->id, 'chapter_id' => 1]);
})->throws(UniqueConstraintViolationException::class);

it('deletes sets and rows when the recitation is deleted', function (): void {
    $recitation = Recitation::factory()->create();
    TaybahTimingSet::factory()->create(['recitation_id' => $recitation->id, 'chapter_id' => 1]);
    TaybahRecitationTiming::factory()->count(2)->sequence(
        ['verse_id' => 1, 'start_ms' => 0, 'end_ms' => 500],
        ['verse_id' => 2, 'start_ms' => 500, 'end_ms' => 1000],
    )->create(['recitation_id' => $recitation->id]);

    $recitation->delete();

    expect(TaybahTimingSet::query()->count())->toBe(0)
        ->and(TaybahRecitationTiming::query()->count())->toBe(0);
});

it('does not delete Taybah rows when the recitation files are replaced', function (): void {
    ['recitation' => $recitation, 'file' => $file] = taybahRecitationWithFile();
    TaybahTimingSet::factory()->create(['recitation_id' => $recitation->id, 'chapter_id' => 1]);
    TaybahRecitationTiming::factory()->count(2)->sequence(
        ['verse_id' => 1, 'start_ms' => 0, 'end_ms' => 500],
        ['verse_id' => 2, 'start_ms' => 500, 'end_ms' => 1000],
    )->create(['recitation_id' => $recitation->id]);

    app(ChapterAudioFileRepository::class)->deleteForRecitation($recitation->id);
    app(ChapterAudioFileRepository::class)->insert([[
        'id' => $file->id,
        'recitation_id' => $recitation->id,
        'chapter_id' => 1,
        'audio_url' => $file->audio_url,
        'size_bytes' => 1024,
        'duration_ms' => 60_000,
        'format' => 'mp3',
    ]]);

    expect(TaybahTimingSet::query()->count())->toBe(1)
        ->and(TaybahRecitationTiming::query()->count())->toBe(2);
});

it('rolls the migrations down and up again', function (): void {
    taybahMigration('create_taybah_recitation_timings_table')->down();
    taybahMigration('create_taybah_timing_sets_table')->down();

    expect(Schema::hasTable('taybah_recitation_timings'))->toBeFalse()
        ->and(Schema::hasTable('taybah_timing_sets'))->toBeFalse();

    taybahMigration('create_taybah_timing_sets_table')->up();
    taybahMigration('create_taybah_recitation_timings_table')->up();

    expect(Schema::hasTable('taybah_timing_sets'))->toBeTrue()
        ->and(Schema::hasTable('taybah_recitation_timings'))->toBeTrue();
});

it('reports a set as served only while the file url matches', function (): void {
    $repository = app(TaybahTimingRepository::class);
    ['recitation' => $recitation, 'file' => $file] = taybahRecitationWithFile();
    TaybahTimingSet::factory()->create([
        'recitation_id' => $recitation->id,
        'chapter_id' => 1,
        'audio_url' => $file->audio_url,
    ]);

    expect($repository->hasServedSet($recitation->id, 1, $file->audio_url))->toBeTrue();

    ChapterAudioFile::query()->whereKey($file->id)->update(['audio_url' => 'https://audio.example.test/fixture/moved.mp3']);

    expect($repository->hasServedSet($recitation->id, 1, $file->audio_url))->toBeFalse();
});

it('reports served segments only for a matching file and a non-null segments row', function (): void {
    $repository = app(TaybahTimingRepository::class);
    ['recitation' => $recitation, 'file' => $file] = taybahRecitationWithFile();
    TaybahTimingSet::factory()->create([
        'recitation_id' => $recitation->id,
        'chapter_id' => 1,
        'audio_url' => $file->audio_url,
    ]);
    TaybahRecitationTiming::factory()->create([
        'recitation_id' => $recitation->id,
        'chapter_id' => 1,
        'verse_id' => 1,
        'segments' => [[1, 0, 1000]],
    ]);

    expect($repository->anyServedSegments($recitation->id))->toBeTrue();

    ChapterAudioFile::query()->whereKey($file->id)->update(['audio_url' => 'https://audio.example.test/fixture/moved.mp3']);

    expect($repository->anyServedSegments($recitation->id))->toBeFalse();

    ChapterAudioFile::query()->whereKey($file->id)->update(['audio_url' => $file->audio_url]);
    TaybahRecitationTiming::query()->update(['segments' => null]);

    expect($repository->anyServedSegments($recitation->id))->toBeFalse();
});

it('lists stale sets', function (): void {
    $repository = app(TaybahTimingRepository::class);

    ['recitation' => $moved, 'file' => $movedFile] = taybahRecitationWithFile();
    TaybahTimingSet::factory()->create(['recitation_id' => $moved->id, 'chapter_id' => 1, 'audio_url' => $movedFile->audio_url]);
    ChapterAudioFile::query()->whereKey($movedFile->id)->update(['audio_url' => 'https://audio.example.test/fixture/moved.mp3']);

    ['recitation' => $gone] = taybahRecitationWithFile();
    TaybahTimingSet::factory()->create(['recitation_id' => $gone->id, 'chapter_id' => 2, 'audio_url' => 'https://audio.example.test/fixture/002.mp3']);

    ['recitation' => $current, 'file' => $currentFile] = taybahRecitationWithFile();
    TaybahTimingSet::factory()->create(['recitation_id' => $current->id, 'chapter_id' => 1, 'audio_url' => $currentFile->audio_url]);

    $stale = $repository->staleSets();

    expect($stale)->toHaveCount(2)
        ->and($stale->pluck('recitation_id')->sort()->values()->all())->toBe(collect([$moved->id, $gone->id])->sort()->values()->all());
});

it('stores segments as json and null as sql null', function (): void {
    $repository = app(TaybahTimingRepository::class);
    $recitation = Recitation::factory()->create();

    $repository->insertRows([
        [
            'recitation_id' => $recitation->id,
            'chapter_id' => 1,
            'verse_id' => 1,
            'start_ms' => 0,
            'end_ms' => 500,
            'segments' => [[1, 0, 500]],
        ],
        [
            'recitation_id' => $recitation->id,
            'chapter_id' => 1,
            'verse_id' => 2,
            'start_ms' => 500,
            'end_ms' => 1000,
            'segments' => null,
        ],
    ]);

    $rows = TaybahRecitationTiming::query()->toBase()->orderBy('verse_id')->get()->all();

    expect(json_decode((string) $rows[0]->segments, true))->toBe([[1, 0, 500]])
        ->and($rows[1]->segments)->toBeNull();
});

it('creates valid rows from the factories', function (): void {
    $set = TaybahTimingSet::factory()->create();
    $timing = TaybahRecitationTiming::factory()->create();

    expect($set->fresh()->source)->toBe(TaybahTimingSource::Aligner)
        ->and($set->fresh()->imported_at)->toBeInstanceOf(DateTimeImmutable::class)
        ->and($timing->segments)->toBe([[1, 0, 1000]])
        ->and(TaybahRecitationTiming::query()->where('recitation_id', $timing->recitation_id)->where('chapter_id', 1)->where('verse_id', 1)->exists())->toBeTrue();
});
