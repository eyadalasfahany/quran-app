<?php

declare(strict_types=1);

use App\Domains\Content\Enums\PermissionStatus;
use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Enums\TaybahTimingKind;
use App\Domains\Content\Events\ResourceContentChanged;
use App\Domains\Content\Models\ChapterAudioFile;
use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Mushaf;
use App\Domains\Content\Models\Recitation;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Models\TaybahRecitationTiming;
use App\Domains\Content\Models\TaybahTimingSet;
use App\Domains\Content\Models\WordLayout;
use App\Domains\Content\Services\TaybahTimingImporter;
use App\Domains\Content\Timings\TaybahImportReport;
use App\Support\QuranText\ChapterVerseCounts;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

/**
 * One temporary timing folder per PHP process. Removed after each test.
 */
function timingRoot(): string
{
    static $root = null;

    return $root ??= storage_path('framework/testing/timings-'.uniqid());
}

function timingUrl(string $kind, string $key, int $chapter): string
{
    return 'https://audio.example.test/fixture/'.$kind.'/'.$key.'/'.sprintf('%03d', $chapter).'.mp3';
}

function timingRecitation(string $sourceCode, string $key): Recitation
{
    $source = ContentSource::query()->firstOrCreate(['code' => $sourceCode], [
        'name' => $sourceCode,
        'licence_url' => 'https://example.test/licence',
        'attribution_ar' => 'إسناد',
        'attribution_en' => 'Attribution',
        'permission_status' => PermissionStatus::Granted,
    ]);

    $resource = Resource::factory()->create([
        'source_id' => $source->id,
        'group' => ResourceGroup::ChapterRecitations,
        'source_key' => $key,
        'version' => 3,
        'changes_floor_version' => 1,
        'is_active' => true,
    ]);

    return Recitation::factory()->create(['resource_id' => $resource->id]);
}

function timingAudio(Recitation $recitation, int $chapter, string $url): ChapterAudioFile
{
    return ChapterAudioFile::factory()->create([
        'recitation_id' => $recitation->id,
        'chapter_id' => $chapter,
        'audio_url' => $url,
        'size_bytes' => 1024,
    ]);
}

/**
 * Word rows for a chapter: one row per entry of $wordsPerVerse, in verse order. Numbers only.
 *
 * @param  list<int>  $wordsPerVerse
 */
function timingWordLayouts(int $chapter, array $wordsPerVerse): void
{
    if (! Mushaf::query()->whereKey(1)->exists()) {
        Mushaf::factory()->create(['id' => 1]);
    }

    foreach ($wordsPerVerse as $index => $words) {
        $verseId = ChapterVerseCounts::firstVerseId($chapter) + $index;

        for ($position = 1; $position <= $words; $position++) {
            WordLayout::factory()->create([
                'mushaf_id' => 1,
                'verse_id' => $verseId,
                'position_in_verse' => $position,
                'char_type' => 'word',
            ]);
        }
    }
}

/**
 * A valid format 1 document for a chapter. $segmentCounts gives the segments per ayah (positions 1..N).
 *
 * @param  list<int>  $segmentCounts
 * @return array<string, mixed>
 */
function timingDocument(string $kind, string $key, int $chapter, array $segmentCounts): array
{
    $ayahs = [];

    foreach ($segmentCounts as $index => $words) {
        $start = $index * 1000;
        $segments = [];

        for ($position = 1; $position <= $words; $position++) {
            $segments[] = [$position, $start + ($position - 1) * 100, $start + $position * 100];
        }

        $ayahs[] = [
            'verse_key' => $chapter.':'.($index + 1),
            'verse_id' => ChapterVerseCounts::firstVerseId($chapter) + $index,
            'start_ms' => $start,
            'end_ms' => $start + 1000,
            'segments' => $segments,
        ];
    }

    return [
        'format' => 1,
        'kind' => $kind,
        'recitation_key' => $key,
        'chapter_id' => $chapter,
        'audio' => [
            'url' => timingUrl($kind, $key, $chapter),
            'bytes' => 1024,
            'sha256' => str_repeat('a', 64),
            'measured_duration_ms' => count($segmentCounts) * 1000,
        ],
        'source' => 'aligner',
        'tool_version' => '0.0.0-fixture',
        'models' => ['align' => ['id' => 'fixture-model', 'revision' => 'fixture'], 'asr' => null],
        'original_first_start_ms' => null,
        'ayahs' => $ayahs,
    ];
}

/**
 * @param  array<string, mixed>  $document
 */
function timingWrite(string $kind, string $key, int $chapter, array $document): void
{
    $folder = timingRoot().'/'.$kind.'/'.$key;

    File::ensureDirectoryExists($folder);
    file_put_contents(
        $folder.'/'.sprintf('%03d', $chapter).'.json',
        json_encode($document, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
    );
}

/**
 * A recitation with one audio file and word layouts for chapter 108 (3 ayahs, 2 words each), and its committed file.
 */
function timingFixture(string $kind = 'mp3quran', string $key = '253'): Recitation
{
    $recitation = timingRecitation($kind, $key);
    timingAudio($recitation, 108, timingUrl($kind, $key, 108));
    timingWordLayouts(108, [2, 2, 2]);
    timingWrite($kind, $key, 108, timingDocument($kind, $key, 108, [2, 2, 2]));

    return $recitation;
}

function timingImporter(): TaybahTimingImporter
{
    return app(TaybahTimingImporter::class);
}

function timingResource(Recitation $recitation): Resource
{
    $resource = Resource::query()->find($recitation->resource_id);

    expect($resource)->toBeInstanceOf(Resource::class);

    return $resource;
}

function timingSkipReason(TaybahImportReport $report, string $path): ?string
{
    foreach ($report->skipped as $skipped) {
        if ($skipped['path'] === $path) {
            return $skipped['reason'];
        }
    }

    return null;
}

beforeEach(function (): void {
    config(['quran.recitation_timings.path' => timingRoot()]);
    Event::fake([ResourceContentChanged::class]);
});

afterEach(function (): void {
    File::deleteDirectory(timingRoot());
});

it('imports a file, bumps the resource once, and dispatches one ResourceContentChanged', function (): void {
    $recitation = timingFixture();

    $report = timingImporter()->import();

    expect($report->imported)->toBe(1)
        ->and($report->versionBumps)->toBe(1)
        ->and($report->hasProblems())->toBeFalse();

    $resource = timingResource($recitation);

    expect($resource->version)->toBe(4)
        ->and($resource->changes_floor_version)->toBe(4)
        ->and(TaybahTimingSet::query()->count())->toBe(1)
        ->and(TaybahRecitationTiming::query()->count())->toBe(3);

    Event::assertDispatchedTimes(ResourceContentChanged::class, 1);
    Event::assertDispatched(
        ResourceContentChanged::class,
        fn (ResourceContentChanged $event): bool => $event->resourceId === $resource->id && $event->version === 4,
    );
});

it('is idempotent: a second run imports nothing and bumps nothing', function (): void {
    $recitation = timingFixture();
    timingImporter()->import();
    $importedAt = TaybahTimingSet::query()->sole()->imported_at;

    $report = timingImporter()->import();

    expect($report->imported)->toBe(0)
        ->and($report->unchanged)->toBe(1)
        ->and($report->versionBumps)->toBe(0)
        ->and(timingResource($recitation)->version)->toBe(4)
        ->and(TaybahTimingSet::query()->sole()->imported_at)->toEqual($importedAt);

    Event::assertDispatchedTimes(ResourceContentChanged::class, 1);
});

it('reimports and bumps once when the file content changes', function (): void {
    $recitation = timingFixture();
    timingImporter()->import();

    $document = timingDocument('mp3quran', '253', 108, [2, 2, 2]);
    $document['tool_version'] = '0.0.1-fixture';
    timingWrite('mp3quran', '253', 108, $document);

    $report = timingImporter()->import();

    expect($report->imported)->toBe(1)
        ->and($report->versionBumps)->toBe(1)
        ->and(timingResource($recitation)->version)->toBe(5)
        ->and(TaybahTimingSet::query()->sole()->tool_version)->toBe('0.0.1-fixture');

    Event::assertDispatchedTimes(ResourceContentChanged::class, 2);
});

it('bumps once per recitation even when several chapters change', function (): void {
    $recitation = timingFixture();
    timingAudio($recitation, 112, timingUrl('mp3quran', '253', 112));
    timingWordLayouts(112, [1, 1, 1, 1]);
    timingWrite('mp3quran', '253', 112, timingDocument('mp3quran', '253', 112, [1, 1, 1, 1]));

    $report = timingImporter()->import();

    expect($report->imported)->toBe(2)
        ->and($report->versionBumps)->toBe(1)
        ->and(timingResource($recitation)->version)->toBe(4)
        ->and(TaybahTimingSet::query()->count())->toBe(2);

    Event::assertDispatchedTimes(ResourceContentChanged::class, 1);
});

it('with --defer-pack writes rows and bumps but dispatches no event', function (): void {
    $recitation = timingFixture();

    $report = timingImporter()->import(deferPack: true);

    expect($report->imported)->toBe(1)
        ->and(TaybahTimingSet::query()->count())->toBe(1)
        ->and(timingResource($recitation)->version)->toBe(4);

    Event::assertNotDispatched(ResourceContentChanged::class);
});

it('with --dry-run writes nothing', function (): void {
    $recitation = timingFixture();

    $report = timingImporter()->import(dryRun: true);

    expect($report->imported)->toBe(1)
        ->and($report->versionBumps)->toBe(1)
        ->and(TaybahTimingSet::query()->count())->toBe(0)
        ->and(TaybahRecitationTiming::query()->count())->toBe(0)
        ->and(timingResource($recitation)->version)->toBe(3);

    Event::assertNotDispatched(ResourceContentChanged::class);
});

it('nulls the segments of a verse whose positions do not match the QF word count and keeps its ayah timing', function (): void {
    $recitation = timingRecitation('mp3quran', '253');
    timingAudio($recitation, 108, timingUrl('mp3quran', '253', 108));
    timingWordLayouts(108, [2, 4, 2]);
    timingWrite('mp3quran', '253', 108, timingDocument('mp3quran', '253', 108, [2, 3, 2]));

    $report = timingImporter()->import();

    $middle = ChapterVerseCounts::firstVerseId(108) + 1;
    $rows = TaybahRecitationTiming::query()->orderBy('verse_id')->get();

    expect($report->segmentsNulled)->toBe(1)
        ->and($rows[0]->segments)->not->toBeNull()
        ->and($rows[1]->verse_id)->toBe($middle)
        ->and($rows[1]->segments)->toBeNull()
        ->and($rows[1]->start_ms)->toBe(1000)
        ->and($rows[1]->end_ms)->toBe(2000)
        ->and($rows[2]->segments)->not->toBeNull();

    // The digest covers the nulled verses, so adding the missing word to the layout reimports and restores segments.
    WordLayout::query()->where('verse_id', $middle)->where('position_in_verse', 4)->delete();

    $rerun = timingImporter()->import();

    expect($rerun->imported)->toBe(1)
        ->and($rerun->segmentsNulled)->toBe(0)
        ->and(TaybahRecitationTiming::query()->where('verse_id', $middle)->sole()->segments)->not->toBeNull();
});

it('keeps segments with repeated positions when the distinct positions are 1..N', function (): void {
    $recitation = timingRecitation('mp3quran', '253');
    timingAudio($recitation, 108, timingUrl('mp3quran', '253', 108));
    timingWordLayouts(108, [2, 2, 2]);

    $document = timingDocument('mp3quran', '253', 108, [2, 2, 2]);
    $document['ayahs'][0]['segments'] = [[1, 0, 300], [1, 300, 500], [2, 500, 1000]];
    timingWrite('mp3quran', '253', 108, $document);

    $report = timingImporter()->import();

    expect($report->segmentsNulled)->toBe(0)
        ->and(TaybahRecitationTiming::query()->where('verse_id', ChapterVerseCounts::firstVerseId(108))->sole()->segments)
        ->toBe([[1, 0, 300], [1, 300, 500], [2, 500, 1000]]);
});

it('skips the file and stores no digest when word layouts are missing, then imports on the next run after they appear', function (): void {
    $recitation = timingRecitation('mp3quran', '253');
    timingAudio($recitation, 108, timingUrl('mp3quran', '253', 108));
    timingWrite('mp3quran', '253', 108, timingDocument('mp3quran', '253', 108, [2, 2, 2]));

    $report = timingImporter()->import();

    expect(timingSkipReason($report, 'mp3quran/253/108.json'))->toBe('word layouts missing')
        ->and(TaybahTimingSet::query()->count())->toBe(0);

    timingWordLayouts(108, [2, 2, 2]);

    $rerun = timingImporter()->import();

    expect($rerun->imported)->toBe(1)
        ->and($rerun->hasProblems())->toBeFalse();
});

it('skips a file whose audio url differs from the current file', function (): void {
    $recitation = timingFixture();
    ChapterAudioFile::query()->where('recitation_id', $recitation->id)->update(['audio_url' => 'https://audio.example.test/other.mp3']);

    $report = timingImporter()->import();

    expect(timingSkipReason($report, 'mp3quran/253/108.json'))->toBe('audio url differs')
        ->and(TaybahTimingSet::query()->count())->toBe(0);
});

it('skips an mp3quran file whose size differs', function (): void {
    $recitation = timingRecitation('mp3quran', '253');
    timingAudio($recitation, 108, timingUrl('mp3quran', '253', 108));
    timingWordLayouts(108, [2, 2, 2]);
    $document = timingDocument('mp3quran', '253', 108, [2, 2, 2]);
    $document['audio']['bytes'] = 999;
    timingWrite('mp3quran', '253', 108, $document);

    $report = timingImporter()->import();

    expect(timingSkipReason($report, 'mp3quran/253/108.json'))->toBe('size differs');
});

it('skips a file with a missing ayah row', function (): void {
    $recitation = timingRecitation('mp3quran', '253');
    timingAudio($recitation, 108, timingUrl('mp3quran', '253', 108));
    timingWordLayouts(108, [2, 2, 2]);
    $document = timingDocument('mp3quran', '253', 108, [2, 2, 2]);
    array_pop($document['ayahs']);
    timingWrite('mp3quran', '253', 108, $document);

    $report = timingImporter()->import();

    expect(timingSkipReason($report, 'mp3quran/253/108.json'))->toBe('ayah rows do not match the surah');
});

it('skips non-contiguous or overlapping rows', function (int $nextStart): void {
    $recitation = timingRecitation('mp3quran', '253');
    timingAudio($recitation, 108, timingUrl('mp3quran', '253', 108));
    timingWordLayouts(108, [2, 2, 2]);
    $document = timingDocument('mp3quran', '253', 108, [2, 2, 2]);
    $document['ayahs'][1]['start_ms'] = $nextStart;
    timingWrite('mp3quran', '253', 108, $document);

    $report = timingImporter()->import();

    expect(timingSkipReason($report, 'mp3quran/253/108.json'))->toBe('bad ayah range');
})->with([
    'gap' => [1100],
    'overlap' => [900],
]);

it('skips a start that is not before its end', function (): void {
    $recitation = timingRecitation('mp3quran', '253');
    timingAudio($recitation, 108, timingUrl('mp3quran', '253', 108));
    timingWordLayouts(108, [2, 2, 2]);
    $document = timingDocument('mp3quran', '253', 108, [2, 2, 2]);
    $document['ayahs'][1]['end_ms'] = 1000;
    timingWrite('mp3quran', '253', 108, $document);

    $report = timingImporter()->import();

    expect(timingSkipReason($report, 'mp3quran/253/108.json'))->toBe('bad ayah range');
});

it('skips a last ayah that ends more than 2 s past the measured duration or leaves a long tail', function (): void {
    $recitation = timingRecitation('mp3quran', '253');
    timingAudio($recitation, 108, timingUrl('mp3quran', '253', 108));
    timingWordLayouts(108, [2, 2, 2]);

    $late = timingDocument('mp3quran', '253', 108, [2, 2, 2]);
    $late['audio']['measured_duration_ms'] = 500;
    timingWrite('mp3quran', '253', 108, $late);

    $tail = timingDocument('mp3quran', '253', 108, [2, 2, 2]);
    $tail['audio']['measured_duration_ms'] = 100000;
    $tail['ayahs'][2]['end_ms'] = 50000;
    $tail['ayahs'][2]['segments'] = [[1, 2000, 2100], [2, 2100, 2200]];
    timingWrite('mp3quran', '253', 108, $tail);

    $report = timingImporter()->import();

    expect(timingSkipReason($report, 'mp3quran/253/108.json'))->toBe('timings do not fit the audio')
        ->and(TaybahTimingSet::query()->count())->toBe(0);

    // Two seconds past the audio is still allowed.
    $within = timingDocument('mp3quran', '253', 108, [2, 2, 2]);
    $within['audio']['measured_duration_ms'] = 1000;
    $within['ayahs'][2]['end_ms'] = 3000;
    timingWrite('mp3quran', '253', 108, $within);

    expect(timingImporter()->import()->imported)->toBe(1);
});

it('skips a file whose folder or name disagrees with its content', function (): void {
    $recitation = timingRecitation('mp3quran', '253');
    timingAudio($recitation, 108, timingUrl('mp3quran', '253', 108));
    timingWordLayouts(108, [2, 2, 2]);

    $wrongChapter = timingDocument('mp3quran', '253', 108, [2, 2, 2]);
    $wrongChapter['chapter_id'] = 109;
    timingWrite('mp3quran', '253', 108, $wrongChapter);

    $report = timingImporter()->import();

    expect(timingSkipReason($report, 'mp3quran/253/108.json'))->toBe('chapter_id differs from the file name');

    $wrongKind = timingDocument('qf', '253', 108, [2, 2, 2]);
    timingWrite('mp3quran', '253', 108, $wrongKind);

    expect(timingSkipReason(timingImporter()->import(), 'mp3quran/253/108.json'))->toBe('kind differs from the folder');
});

it('skips an unknown recitation and an unknown source', function (): void {
    timingRecitation('mp3quran', '253');
    timingWrite('mp3quran', '999', 108, timingDocument('mp3quran', '999', 108, [2, 2, 2]));
    timingWrite('qf', '5', 108, timingDocument('qf', '5', 108, [2, 2, 2]));

    $report = timingImporter()->import();

    expect(timingSkipReason($report, 'mp3quran/999/108.json'))->toBe('no such recitation')
        ->and(timingSkipReason($report, 'qf/5/108.json'))->toBe('no such recitation')
        ->and($report->imported)->toBe(0);
});

it('never imports QF reciter 168, but imports an mp3quran moshaf with id 168', function (): void {
    $qf = timingFixture('qf', '168');
    $mp3 = timingFixture('mp3quran', '168');

    $report = timingImporter()->import();

    expect(timingSkipReason($report, 'qf/168/108.json'))->toBe('excluded recitation')
        ->and(TaybahTimingSet::query()->where('recitation_id', $qf->id)->count())->toBe(0)
        ->and(TaybahTimingSet::query()->where('recitation_id', $mp3->id)->count())->toBe(1);
});

it('keeps a QF reciter 5 and an mp3quran moshaf 5 separate', function (): void {
    $qf = timingFixture('qf', '5');
    $mp3 = timingFixture('mp3quran', '5');

    $report = timingImporter()->import();

    expect($report->imported)->toBe(2)
        ->and($report->hasProblems())->toBeFalse()
        ->and(TaybahTimingSet::query()->where('recitation_id', $qf->id)->sole()->audio_url)->toBe(timingUrl('qf', '5', 108))
        ->and(TaybahTimingSet::query()->where('recitation_id', $mp3->id)->sole()->audio_url)->toBe(timingUrl('mp3quran', '5', 108));
});

it('does not delete stored sets when the folder is empty or missing', function (): void {
    $recitation = timingFixture();
    timingImporter()->import();

    File::delete(timingRoot().'/mp3quran/253/108.json');

    $empty = timingImporter()->import();

    expect($empty->filesSeen)->toBe(0)
        ->and($empty->hasProblems())->toBeFalse()
        ->and(TaybahTimingSet::query()->where('recitation_id', $recitation->id)->count())->toBe(1)
        ->and(TaybahRecitationTiming::query()->count())->toBe(3);

    File::deleteDirectory(timingRoot());

    $missing = timingImporter()->import();

    expect($missing->filesSeen)->toBe(0)
        ->and(TaybahTimingSet::query()->count())->toBe(1);
});

it('sets has_word_segments from the Taybah rows, and false when every verse was nulled', function (): void {
    $recitation = timingFixture();
    timingImporter()->import();

    expect($recitation->fresh()->has_word_segments)->toBeTrue();

    $allWrong = timingDocument('mp3quran', '253', 108, [2, 2, 2]);

    foreach ($allWrong['ayahs'] as $index => $ayah) {
        $allWrong['ayahs'][$index]['segments'] = [[5, $ayah['start_ms'], $ayah['end_ms']]];
    }

    timingWrite('mp3quran', '253', 108, $allWrong);
    timingImporter()->import();

    expect(TaybahRecitationTiming::query()->whereNotNull('segments')->count())->toBe(0)
        ->and($recitation->fresh()->has_word_segments)->toBeFalse();
});

it('exits non-zero and names the file when anything was skipped', function (): void {
    $recitation = timingFixture();
    ChapterAudioFile::query()->where('recitation_id', $recitation->id)->update(['audio_url' => 'https://audio.example.test/other.mp3']);

    $code = Artisan::call('recitation-timings:import');
    $output = Artisan::output();

    expect($code)->toBe(1)
        ->and($output)->toContain('mp3quran/253/108.json')
        ->and($output)->toContain('audio url differs')
        ->and(preg_match('/\p{Arabic}/u', $output))->toBe(0);
});

it('reads no storage credential and calls no http', function (): void {
    timingFixture();

    Http::preventStrayRequests();

    expect(timingImporter()->import()->imported)->toBe(1);

    $source = file_get_contents(app_path('Domains/Content/Services/TaybahTimingImporter.php'));

    expect($source)->not->toBeFalse()
        ->and($source)->not->toContain('R2_')
        ->and($source)->not->toContain('s3');
});

it('rejects an unknown --kind', function (): void {
    timingFixture();

    expect(Artisan::call('recitation-timings:import', ['--kind' => 'bogus']))->toBe(1)
        ->and(TaybahTimingKind::tryFrom('bogus'))->toBeNull();
});

it('imports a way2quran file from its own folder and kind (ADR 0074 decision 6)', function (): void {
    $recitation = timingFixture('way2quran', '1');

    $report = timingImporter()->import();

    expect(timingSkipReason($report, 'way2quran/1/108.json'))->toBeNull()
        ->and($report->imported)->toBe(1)
        ->and(TaybahTimingSet::query()->where('recitation_id', $recitation->id)->sole()->source->value)->toBe('aligner')
        ->and(TaybahRecitationTiming::query()->where('recitation_id', $recitation->id)->count())->toBe(3);
});

it('skips a way2quran file whose size differs', function (): void {
    $recitation = timingRecitation('way2quran', '1');
    timingAudio($recitation, 108, timingUrl('way2quran', '1', 108));
    timingWordLayouts(108, [2, 2, 2]);
    $document = timingDocument('way2quran', '1', 108, [2, 2, 2]);
    $document['audio']['bytes'] = 999;
    timingWrite('way2quran', '1', 108, $document);

    $report = timingImporter()->import();

    expect(timingSkipReason($report, 'way2quran/1/108.json'))->toBe('size differs')
        ->and(TaybahTimingSet::query()->where('recitation_id', $recitation->id)->count())->toBe(0);
});

it('does not check the audio size of a qf file', function (): void {
    $recitation = timingRecitation('qf', '5');
    timingAudio($recitation, 108, timingUrl('qf', '5', 108));
    timingWordLayouts(108, [2, 2, 2]);
    $document = timingDocument('qf', '5', 108, [2, 2, 2]);
    $document['audio']['bytes'] = 999;
    timingWrite('qf', '5', 108, $document);

    $report = timingImporter()->import();

    expect(timingSkipReason($report, 'qf/5/108.json'))->toBeNull()
        ->and(TaybahTimingSet::query()->where('recitation_id', $recitation->id)->count())->toBe(1);
});

it('--kind=way2quran imports only the way2quran folder', function (): void {
    $mp3 = timingFixture('mp3quran', '253');
    $way = timingFixture('way2quran', '1');

    expect(Artisan::call('recitation-timings:import', ['--kind' => 'way2quran']))->toBe(0)
        ->and(TaybahTimingSet::query()->where('recitation_id', $way->id)->count())->toBe(1)
        ->and(TaybahTimingSet::query()->where('recitation_id', $mp3->id)->count())->toBe(0);
});

it('names way2quran among the kinds an unknown --kind is refused with', function (): void {
    $this->artisan('recitation-timings:import --kind=bogus')
        ->expectsOutputToContain('Use qf, mp3quran or way2quran.')
        ->assertFailed();
});
