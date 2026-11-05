<?php

declare(strict_types=1);

use App\Domains\Content\Enums\ChangeOperation;
use App\Domains\Content\Enums\PermissionStatus;
use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Enums\SyncRunStatus;
use App\Domains\Content\Models\ChapterAudioFile;
use App\Domains\Content\Models\ContentChange;
use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Mushaf;
use App\Domains\Content\Models\MushafPage;
use App\Domains\Content\Models\Recitation;
use App\Domains\Content\Models\RecitationTiming;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Models\SyncRun;
use App\Domains\Content\Models\SyncState;
use App\Domains\Content\Models\TafsirEntry;
use App\Domains\Content\Models\TaybahRecitationTiming;
use App\Domains\Content\Models\TaybahTimingSet;
use App\Domains\Content\Models\WordLayout;
use App\Domains\Content\Mp3Quran\Mp3QuranFileId;
use App\Domains\Content\Services\ContentSyncService;
use App\Domains\Content\Services\Mp3QuranImporter;
use App\Domains\Content\Services\RecitationSegmentsFlagService;
use App\Domains\Content\Sync\SyncException;
use Database\Seeders\ContentSourceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Factory;
use Illuminate\Http\Client\Response;
use Illuminate\Http\Client\ResponseSequence;
use Illuminate\Log\Events\MessageLogged;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Sleep;
use Tests\Support\QuranFoundationFixture;

uses(RefreshDatabase::class);

const CONTENT_HOST = 'https://apis-prelive.quran.foundation/content';

beforeEach(function (): void {
    Http::preventStrayRequests();
    Sleep::fake();

    config()->set('quran.qf.environment', 'prelive');
    config()->set('quran.qf.client_id', 'test-client-id');
    config()->set('quran.qf.client_secret', 'test-client-secret');
    config()->set('quran.qf.contact_email', 'ops@taybah.test');

    QuranFoundationFixture::forgetBindings();
    $this->seed(ContentSourceSeeder::class);
});

it('stores one tafsir row per group with sanitized html and a raw source hash', function (): void {
    $raw = '<h1><span style="color: rgb(59, 62, 102);">Introduction</span></h1>';
    $other = '<p>Other</p>';

    runContent(ResourceGroup::Tafsirs, 'tafsirs:*', [
        CONTENT_HOST.'/api/v4/resources/tafsirs?language=ar' => ['tafsirs' => []],
        CONTENT_HOST.'/api/v4/resources/tafsirs' => [
            'tafsirs' => [[
                'id' => 169,
                'name' => 'Sample tafsir',
                'author_name' => null,
                'slug' => 'sample',
                'language_name' => 'arabic',
            ]],
        ],
        CONTENT_HOST.'/api/v4/resources/snapshots/tafsirs/169' => contentSnapshot('tafsirs', 169, [
            tafsirRecord(82641, $raw),
            tafsirRecord(82641, '<p>skipped</p>', 2),
            tafsirRecord(82641, '<script>no</script>', 3),
            [
                'id' => 900,
                'verse_id' => 8,
                'verse_key' => '1:7',
                'group_tafsir_id' => 82642,
                'text' => $other,
                'resource_id' => 169,
            ],
        ]),
    ], [contentResourceMutation('tafsirs', 169, 10, 'RESOURCE_CREATE', '/api/v4/resources/snapshots/tafsirs/169')]);

    $rows = TafsirEntry::query()->orderBy('group_tafsir_id')->get();

    expect($rows)->toHaveCount(2)
        ->and($rows[0]->group_tafsir_id)->toBe(82641)
        ->and($rows[0]->first_verse_id)->toBe(1)
        ->and($rows[0]->last_verse_id)->toBe(1)
        ->and($rows[0]->first_verse_key)->toBe('1:1')
        ->and($rows[0]->last_verse_key)->toBe('1:1')
        ->and($rows[0]->html)->toBe('<h1><span>Introduction</span></h1>')
        ->and($rows[0]->source_hash)->toBe(hash('sha256', $raw))
        ->and($rows[1]->first_verse_id)->toBe(8)
        ->and($rows[1]->last_verse_id)->toBe(8)
        ->and($rows[1]->first_verse_key)->toBe('1:7')
        ->and($rows[1]->last_verse_key)->toBe('1:7')
        ->and($rows[1]->html)->toBe('<p>Other</p>')
        ->and($rows[1]->source_hash)->toBe(hash('sha256', $other))
        ->and(ContentChange::query()->count())->toBe(0)
        ->and(Resource::query()->where('source_key', '169')->value('name'))->toBe('Sample tafsir');
});

it('writes a tafsir change row with the shared-contract columns', function (): void {
    $raw = '<h1><span style="color: rgb(59, 62, 102);">Introduction</span></h1>';

    runContent(ResourceGroup::Tafsirs, 'tafsirs:*', tafsirRoutes($raw), [
        contentResourceMutation('tafsirs', 169, 10, 'RESOURCE_CREATE', '/api/v4/resources/snapshots/tafsirs/169'),
    ]);

    $updated = '<p>Updated</p>';

    runContent(ResourceGroup::Tafsirs, 'tafsirs:*', tafsirRoutes($raw), [
        contentRowMutation('tafsirs', 169, 11, 'ROW_UPDATE', (string) 82641, null, tafsirRecord(82641, $updated)),
    ], 'token-tafsir-row');

    $resource = Resource::query()->where('source_key', '169')->firstOrFail();
    $change = ContentChange::query()->firstOrFail();

    expect($change->entity)->toBe('tafsir_entry')
        ->and($change->entity_key)->toBe('82641')
        ->and($change->op)->toBe(ChangeOperation::Upsert)
        ->and($change->version)->toBe(2)
        ->and($change->payload)->toEqual([
            'resource_id' => $resource->id,
            'group_tafsir_id' => 82641,
            'first_verse_id' => 1,
            'last_verse_id' => 1,
            'html' => '<p>Updated</p>',
        ])
        ->and(TafsirEntry::query()->where('group_tafsir_id', 82641)->value('source_hash'))->toBe(hash('sha256', $updated));
});

it('skips a tafsir missing from the Arabic catalog without storing it or failing the run', function (): void {
    /** @var list<MessageLogged> $infos */
    $infos = [];

    Log::listen(function (MessageLogged $event) use (&$infos): void {
        if ($event->level === 'info' && $event->message === 'Quran Foundation sync skipped tafsirs that are not active Arabic tafsirs.') {
            $infos[] = $event;
        }
    });

    runContent(ResourceGroup::Tafsirs, 'tafsirs:*', [
        CONTENT_HOST.'/api/v4/resources/tafsirs?language=ar' => ['tafsirs' => []],
        CONTENT_HOST.'/api/v4/resources/tafsirs' => ['tafsirs' => [['id' => 170, 'name' => 'Other Arabic tafsir', 'author_name' => null, 'slug' => 'other', 'language_name' => 'arabic']]],
    ], [
        contentResourceMutation('tafsirs', 816, 10, 'RESOURCE_CREATE', '/api/v4/resources/snapshots/tafsirs/816'),
        contentResourceMutation('tafsirs', 816, 11, 'RESOURCE_UPDATE', null),
    ]);

    expect(SyncRun::query()->sole()->status)->toBe(SyncRunStatus::Ok)
        ->and(Resource::query()->where('source_key', '816')->exists())->toBeFalse()
        ->and(TafsirEntry::query()->count())->toBe(0)
        ->and($infos)->toHaveCount(1);
});

it('stores a mushaf, its pages and byte-exact glyphs', function (): void {
    $glyph = "\u{FC41}";

    runContent(ResourceGroup::Mushafs, 'mushafs:1', [
        CONTENT_HOST.'/api/v4/resources/snapshots/mushafs/1' => contentSnapshot('mushafs', 1, mushafRecords($glyph)),
    ], [contentResourceMutation('mushafs', 1, 10, 'RESOURCE_CREATE', '/api/v4/resources/snapshots/mushafs/1')]);

    $resource = Resource::query()->where('source_key', '1')->firstOrFail();
    $mushaf = Mushaf::query()->firstOrFail();
    $storedGlyph = WordLayout::query()->where('word_id', 1)->value('glyph');

    expect(Mushaf::query()->count())->toBe(1)
        ->and(MushafPage::query()->count())->toBe(2)
        ->and(WordLayout::query()->count())->toBe(3)
        ->and($mushaf->id)->toBe(1)
        ->and($mushaf->resource_id)->toBe($resource->id)
        ->and($mushaf->name)->toBe('QCF V2')
        ->and($mushaf->qirat_name)->toBe('Hafs')
        ->and($mushaf->pages_count)->toBe(604)
        ->and($mushaf->lines_per_page)->toBe(15)
        ->and($resource->name)->toBe('QCF V2')
        ->and($resource->language_code)->toBeNull()
        ->and($resource->direction)->toBeNull()
        ->and(is_string($storedGlyph))->toBeTrue()
        ->and(bin2hex((string) $storedGlyph))->toBe(bin2hex($glyph))
        ->and(ContentChange::query()->count())->toBe(0);
});

it('writes mushaf, page and word change rows with the shared-contract columns', function (): void {
    $glyph = "\u{FC41}";

    runContent(ResourceGroup::Mushafs, 'mushafs:1', [
        CONTENT_HOST.'/api/v4/resources/snapshots/mushafs/1' => contentSnapshot('mushafs', 1, mushafRecords($glyph)),
    ], [contentResourceMutation('mushafs', 1, 10, 'RESOURCE_CREATE', '/api/v4/resources/snapshots/mushafs/1')]);

    $page = mushafPage(2, ['2' => '8-10']);
    $word = mushafWord(4, "\u{FC42}");

    runContent(ResourceGroup::Mushafs, 'mushafs:1', [], [
        contentRowMutation('mushafs', 1, 11, 'ROW_UPDATE', '1', 'mushaf', mushafRecord('QCF V2 revised')),
        contentRowMutation('mushafs', 1, 12, 'ROW_UPDATE', '2', 'mushaf_page', $page),
        contentRowMutation('mushafs', 1, 13, 'ROW_UPDATE', '4', 'mushaf_word', $word),
    ], 'token-mushaf-rows');

    $resource = Resource::query()->where('source_key', '1')->firstOrFail();
    $changes = ContentChange::query()->orderBy('id')->get();

    expect($changes)->toHaveCount(3)
        ->and($changes[0]->entity)->toBe('mushaf')
        ->and($changes[0]->entity_key)->toBe('1')
        ->and($changes[0]->payload)->toEqual([
            'id' => 1,
            'resource_id' => $resource->id,
            'name' => 'QCF V2 revised',
            'pages_count' => 604,
            'lines_per_page' => 15,
            'default_font_name' => 'v2',
        ])
        ->and($changes[1]->entity)->toBe('mushaf_page')
        ->and($changes[1]->entity_key)->toBe('2')
        ->and($changes[1]->payload)->toEqual([
            'mushaf_id' => 1,
            'page_number' => 2,
            'first_verse_id' => 8,
            'last_verse_id' => 10,
            'first_word_id' => 4,
            'last_word_id' => 6,
            'verse_mapping' => ['2' => '8-10'],
        ])
        ->and($changes[2]->entity)->toBe('word_layout')
        ->and($changes[2]->entity_key)->toBe('4')
        ->and($changes[2]->payload)->toEqual([
            'mushaf_id' => 1,
            'word_id' => 4,
            'verse_id' => 1,
            'position_in_verse' => 1,
            'char_type' => 'word',
            'glyph' => "\u{FC42}",
            'page' => 1,
            'line' => 9,
            'position_in_line' => 1,
        ])
        ->and($changes->every(fn (ContentChange $change): bool => $change->version === 2 && $change->op === ChangeOperation::Upsert))->toBeTrue();
});

it('fails a mushaf run on an unknown record type without advancing the sequence', function (): void {
    $records = mushafRecords("\u{FC41}");
    $records[] = ['record_type' => 'nope', 'id' => 1];

    expect(fn () => runContent(ResourceGroup::Mushafs, 'mushafs:1', [
        CONTENT_HOST.'/api/v4/resources/snapshots/mushafs/1' => contentSnapshot('mushafs', 1, $records),
    ], [contentResourceMutation('mushafs', 1, 10, 'RESOURCE_CREATE', '/api/v4/resources/snapshots/mushafs/1')]))
        ->toThrow(SyncException::class, 'Unknown mushaf record type [nope].');

    $state = SyncState::query()->first();

    expect($state)->not->toBeNull()
        ->and($state->last_sequence)->toBe(0)
        ->and(Mushaf::query()->count())->toBe(0)
        ->and(MushafPage::query()->count())->toBe(0)
        ->and(WordLayout::query()->count())->toBe(0);
});

it('applies both chapter-recitation pages and normalizes timings', function (): void {
    $audioUrl = 'https://download.quranicaudio.com/qdc/abdul_baset/mujawwad/1.mp3';

    runContent(ResourceGroup::ChapterRecitations, 'chapter_recitations:6;chapter_recitations:7', reciterRoutes(), [], 'token-unused', Http::sequence()
        ->push(contentPage([
            contentResourceMutation('chapter_recitations', 6, 10, 'RESOURCE_CREATE', '/api/v4/resources/snapshots/chapter_recitations/6'),
        ], 'token-page-1', true, '/api/v4/resources/sync?page=2'))
        ->push(contentPage([
            contentRowMutation('chapter_recitations', 6, 11, 'ROW_UPDATE', '1', 'recitation', null),
            contentRowMutation('chapter_recitations', 6, 12, 'ROW_CREATE', '10735', 'chapter_audio_file', audioFile(10735, 2, 10, 6)),
            contentRowMutation('chapter_recitations', 6, 13, 'ROW_CREATE', '10734:2', 'audio_segment', audioSegment(2, [[4, 1.2, 3.8]])),
        ], 'token-page-2')));

    $resource = Resource::query()->where('source_key', '6')->firstOrFail();
    $recitation = Recitation::query()->firstOrFail();
    $file = ChapterAudioFile::query()->findOrFail(10734);
    $added = ChapterAudioFile::query()->findOrFail(10735);
    $timing = RecitationTiming::query()->where('verse_id', 1)->firstOrFail();
    $changes = ContentChange::query()->orderBy('id')->get();
    $state = SyncState::query()->firstOrFail();

    expect($state->sync_token)->toBe('token-page-2')
        ->and($state->last_sequence)->toBe(13)
        ->and($recitation->reciter_name)->toBe('Mahmoud Khaleel Al-Husary')
        ->and($recitation->reciter_name_ar)->toBe('محمود خليل الحصري')
        ->and($recitation->style)->toBe('Murattal')
        ->and($recitation->qirat)->toBe('Hafs')
        ->and($recitation->has_word_segments)->toBeTrue()
        ->and($resource->name)->toBe('Mahmoud Khaleel Al-Husary')
        ->and($file->audio_url)->toBe($audioUrl)
        ->and($file->size_bytes)->toBe(1595520)
        ->and($file->duration_ms)->toBe(78000)
        ->and($file->format)->toBe('mp3')
        ->and($added->duration_ms)->toBe(10000)
        ->and($added->size_bytes)->toBeNull()
        ->and($timing->start_ms)->toBe(0)
        ->and($timing->end_ms)->toBe(6300)
        ->and($timing->segments)->toBe([[1, 0, 960], [2, 970, 1420]])
        ->and($changes)->toHaveCount(3)
        ->and($changes[0]->entity)->toBe('recitation')
        ->and($changes[0]->entity_key)->toBe((string) $recitation->id)
        ->and($changes[0]->payload)->toEqual([
            'id' => $recitation->id,
            'resource_id' => $resource->id,
            'reciter_name' => 'Mahmoud Khaleel Al-Husary',
            'reciter_name_ar' => 'محمود خليل الحصري',
            'style' => 'Murattal',
            'qirat' => 'Hafs',
            'has_word_segments' => true,
        ])
        ->and($changes[1]->entity)->toBe('chapter_audio_file')
        ->and($changes[1]->entity_key)->toBe('10735')
        ->and($changes[1]->payload)->toEqual([
            'id' => 10735,
            'recitation_id' => $recitation->id,
            'chapter_id' => 2,
            'audio_url' => $audioUrl,
            'size_bytes' => null,
            'duration_ms' => 10000,
            'format' => 'mp3',
        ])
        ->and($changes[2]->entity)->toBe('recitation_timing')
        ->and($changes[2]->entity_key)->toBe('10734:2')
        ->and($changes[2]->payload)->toEqual([
            'audio_file_id' => 10734,
            'verse_id' => 2,
            'start_ms' => 0,
            'end_ms' => 6300,
            'segments' => [[4, 1, 4]],
        ]);
});

it('skips a chapter audio file with no chapter and no audio url in a snapshot and keeps the 114 surah files', function (): void {
    /** @var list<MessageLogged> $warnings */
    $warnings = [];

    Log::listen(function (MessageLogged $event) use (&$warnings): void {
        if ($event->level === 'warning' && $event->message === 'Quran Foundation chapter recitation snapshot has audio files that are not surahs; they are skipped.') {
            $warnings[] = $event;
        }
    });

    $surahFiles = array_map(fn (int $chapterId): array => audioFile(10000 + $chapterId, $chapterId, 10, 10000), range(1, 114));
    $segment = audioSegment(1, [[1, 0.0, 960.0]]);
    $segment['audio_file_id'] = 10001;
    $extra = [
        'record_type' => 'chapter_audio_file',
        'id' => 99999,
        'audio_recitation_id' => 1,
        'chapter_id' => null,
        'audio_url' => null,
        'duration' => 10,
        'duration_ms' => null,
        'file_size' => 100,
        'format' => 'mp3',
        'file_name' => 'FIXTURE-extra.mp3',
        'metadata' => null,
    ];

    runContent(ResourceGroup::ChapterRecitations, 'chapter_recitations:6', reciterRoutes(), [
        contentResourceMutation('chapter_recitations', 6, 10, 'RESOURCE_CREATE', '/api/v4/resources/snapshots/chapter_recitations/6'),
    ], extra: [
        CONTENT_HOST.'/api/v4/resources/snapshots/chapter_recitations/6' => contentSnapshot('chapter_recitations', 6, [
            ...$surahFiles,
            $extra,
            $segment,
        ]),
    ]);

    expect(SyncRun::query()->sole()->status)->toBe(SyncRunStatus::Ok)
        ->and(ChapterAudioFile::query()->count())->toBe(114)
        ->and(ChapterAudioFile::query()->where('id', 99999)->exists())->toBeFalse()
        ->and(Recitation::query()->sole()->has_word_segments)->toBeTrue()
        ->and($warnings)->toHaveCount(1)
        ->and($warnings[0]->context)->toMatchArray(['count' => 1, 'record_id' => 99999, 'file_name' => 'FIXTURE-extra.mp3']);
});

it('skips untimed audio segments in a snapshot, keeps the valid timings and logs one warning', function (): void {
    /** @var list<MessageLogged> $warnings */
    $warnings = [];

    Log::listen(function (MessageLogged $event) use (&$warnings): void {
        if ($event->level === 'warning' && $event->message === 'Quran Foundation chapter recitation snapshot has audio segments without a valid timing; they are skipped.') {
            $warnings[] = $event;
        }
    });

    $file = audioFile(10001, 1, 10, 10000);
    $valid = audioSegment(1, [[1, 0.0, 960.0]]);
    $valid['audio_file_id'] = 10001;
    $zeroZero = audioSegment(7, [[1, 0.0, 960.0]]);
    $zeroZero['audio_file_id'] = 10001;
    $zeroZero['timestamp_from'] = 0;
    $zeroZero['timestamp_to'] = 0;
    $nullNull = audioSegment(8, [[1, 0.0, 960.0]]);
    $nullNull['audio_file_id'] = 10001;
    $nullNull['timestamp_from'] = null;
    $nullNull['timestamp_to'] = null;

    runContent(ResourceGroup::ChapterRecitations, 'chapter_recitations:6', reciterRoutes(), [
        contentResourceMutation('chapter_recitations', 6, 10, 'RESOURCE_CREATE', '/api/v4/resources/snapshots/chapter_recitations/6'),
    ], extra: [
        CONTENT_HOST.'/api/v4/resources/snapshots/chapter_recitations/6' => contentSnapshot('chapter_recitations', 6, [
            $file,
            $zeroZero,
            $nullNull,
            $valid,
        ]),
    ]);

    expect(SyncRun::query()->sole()->status)->toBe(SyncRunStatus::Ok)
        ->and(RecitationTiming::query()->pluck('verse_id')->all())->toBe([1])
        ->and(RecitationTiming::query()->sole()->start_ms)->toBe(0)
        ->and(RecitationTiming::query()->sole()->end_ms)->toBe(6300)
        ->and(Recitation::query()->sole()->has_word_segments)->toBeTrue()
        ->and($warnings)->toHaveCount(1)
        ->and($warnings[0]->context)->toMatchArray(['resource_id' => '6', 'count' => 2, 'verse_key' => '1:7']);
});

it('stores the files of an untrusted reciter but none of its timings, so the app plays it without highlight', function (): void {
    config(['quran.untrusted_timing_recitations' => [6]]);
    $segment = audioSegment(1, [[1, 0.0, 960.0]]);
    $segment['audio_file_id'] = 10001;

    runContent(ResourceGroup::ChapterRecitations, 'chapter_recitations:6', reciterRoutes(), [
        contentResourceMutation('chapter_recitations', 6, 10, 'RESOURCE_CREATE', '/api/v4/resources/snapshots/chapter_recitations/6'),
    ], extra: [
        CONTENT_HOST.'/api/v4/resources/snapshots/chapter_recitations/6' => contentSnapshot('chapter_recitations', 6, [
            audioFile(10001, 1, 10, 10000),
            $segment,
        ]),
    ]);

    expect(SyncRun::query()->sole()->status)->toBe(SyncRunStatus::Ok)
        ->and(ChapterAudioFile::query()->pluck('id')->all())->toBe([10001])
        ->and(RecitationTiming::query()->count())->toBe(0)
        ->and(Recitation::query()->sole()->has_word_segments)->toBeFalse();
});

it('skips a row-created timing for an untrusted reciter and removes one already stored', function (): void {
    bootstrapChapterRecitationResource();
    $stored = RecitationTiming::query()->firstOrFail();
    config(['quran.untrusted_timing_recitations' => [6]]);
    $segment = audioSegment($stored->verse_id, [[1, 0.0, 960.0]]);
    $segment['audio_file_id'] = $stored->audio_file_id;

    runContent(ResourceGroup::ChapterRecitations, 'chapter_recitations:6', reciterRoutes(), [
        contentRowMutation('chapter_recitations', 6, 11, 'ROW_UPDATE', $stored->audio_file_id.':'.$stored->verse_id, 'audio_segment', $segment),
    ], 'token-row');

    expect(SyncRun::query()->latest('id')->firstOrFail()->status)->toBe(SyncRunStatus::Ok)
        ->and(RecitationTiming::query()->where('audio_file_id', $stored->audio_file_id)->where('verse_id', $stored->verse_id)->exists())->toBeFalse();
});

it('still fails a chapter recitation snapshot when an audio segment timestamp is a string', function (): void {
    $segment = audioSegment(1, [[1, 0.0, 960.0]]);
    $segment['audio_file_id'] = 10734;
    $segment['timestamp_from'] = '0';

    expect(fn () => runContent(ResourceGroup::ChapterRecitations, 'chapter_recitations:6', reciterRoutes(), [
        contentResourceMutation('chapter_recitations', 6, 10, 'RESOURCE_CREATE', '/api/v4/resources/snapshots/chapter_recitations/6'),
    ], extra: [
        CONTENT_HOST.'/api/v4/resources/snapshots/chapter_recitations/6' => contentSnapshot('chapter_recitations', 6, [
            audioFile(10734, 1, 10, 10000),
            $segment,
        ]),
    ]))->toThrow(SyncException::class, 'Sync record is missing timestamp_from.');

    expect(RecitationTiming::query()->count())->toBe(0)
        ->and(SyncState::query()->first()?->last_sequence ?? 0)->toBe(0);
});

it('fails a chapter recitation snapshot when a file has no chapter but has an audio url', function (): void {
    $broken = audioFile(20001, 1, 10, 10000);
    $broken['chapter_id'] = null;

    expect(fn () => runContent(ResourceGroup::ChapterRecitations, 'chapter_recitations:6', reciterRoutes(), [
        contentResourceMutation('chapter_recitations', 6, 10, 'RESOURCE_CREATE', '/api/v4/resources/snapshots/chapter_recitations/6'),
    ], extra: [
        CONTENT_HOST.'/api/v4/resources/snapshots/chapter_recitations/6' => contentSnapshot('chapter_recitations', 6, [$broken]),
    ]))->toThrow(SyncException::class, 'Sync record is missing chapter_id.');

    expect(ChapterAudioFile::query()->count())->toBe(0)
        ->and(SyncState::query()->first()?->last_sequence ?? 0)->toBe(0);
});

it('skips a row-created non-surah audio file after bootstrap, keeps the sequence and logs one warning', function (): void {
    /** @var list<MessageLogged> $warnings */
    $warnings = [];

    Log::listen(function (MessageLogged $event) use (&$warnings): void {
        if ($event->level === 'warning' && $event->message === 'Quran Foundation chapter recitation row is not stored; it is skipped.') {
            $warnings[] = $event;
        }
    });

    bootstrapChapterRecitationResource();

    $dua = audioFile(20001, 1, 10, 10000);
    $dua['chapter_id'] = null;
    $dua['audio_url'] = null;

    runContent(ResourceGroup::ChapterRecitations, 'chapter_recitations:6', reciterRoutes(), [
        contentRowMutation('chapter_recitations', 6, 11, 'ROW_CREATE', '20001', 'chapter_audio_file', $dua),
    ], 'token-row');

    expect(SyncRun::query()->latest('id')->firstOrFail()->status)->toBe(SyncRunStatus::Ok)
        ->and(SyncState::query()->firstOrFail()->last_sequence)->toBe(11)
        ->and(ChapterAudioFile::query()->where('id', 20001)->exists())->toBeFalse()
        ->and(ChapterAudioFile::query()->count())->toBe(1)
        ->and(ContentChange::query()->count())->toBe(0)
        ->and(Resource::query()->where('source_key', '6')->firstOrFail()->version)->toBe(1)
        ->and($warnings)->toHaveCount(1)
        ->and($warnings[0]->context)->toMatchArray(['resource_id' => '6', 'record_type' => 'chapter_audio_file', 'record_id' => '20001']);
});

it('skips a row-created untimed audio segment after bootstrap and logs its verse key', function (): void {
    /** @var list<MessageLogged> $warnings */
    $warnings = [];

    Log::listen(function (MessageLogged $event) use (&$warnings): void {
        if ($event->level === 'warning' && $event->message === 'Quran Foundation chapter recitation row is not stored; it is skipped.') {
            $warnings[] = $event;
        }
    });

    bootstrapChapterRecitationResource();

    $untimed = audioSegment(2, [[4, 1.2, 3.8]]);
    $untimed['timestamp_from'] = null;
    $untimed['timestamp_to'] = null;

    runContent(ResourceGroup::ChapterRecitations, 'chapter_recitations:6', reciterRoutes(), [
        contentRowMutation('chapter_recitations', 6, 11, 'ROW_CREATE', '10734:2', 'audio_segment', $untimed),
    ], 'token-row');

    expect(SyncRun::query()->latest('id')->firstOrFail()->status)->toBe(SyncRunStatus::Ok)
        ->and(SyncState::query()->firstOrFail()->last_sequence)->toBe(11)
        ->and(RecitationTiming::query()->where('verse_id', 2)->exists())->toBeFalse()
        ->and(RecitationTiming::query()->count())->toBe(1)
        ->and(ContentChange::query()->count())->toBe(0)
        ->and(Resource::query()->where('source_key', '6')->firstOrFail()->version)->toBe(1)
        ->and($warnings)->toHaveCount(1)
        ->and($warnings[0]->context)->toMatchArray(['record_type' => 'audio_segment', 'verse_key' => '1:2']);
});

it('removes a stored timing when an update makes it untimed, recording a delete change', function (): void {
    bootstrapChapterRecitationResource();

    $zeroZero = audioSegment(1, [[1, 0.0, 960.0]]);
    $zeroZero['audio_file_id'] = 10734;
    $zeroZero['timestamp_from'] = 0;
    $zeroZero['timestamp_to'] = 0;

    runContent(ResourceGroup::ChapterRecitations, 'chapter_recitations:6', reciterRoutes(), [
        contentRowMutation('chapter_recitations', 6, 11, 'ROW_UPDATE', '10734:1', 'audio_segment', $zeroZero),
    ], 'token-row');

    $change = ContentChange::query()->sole();

    expect(SyncState::query()->firstOrFail()->last_sequence)->toBe(11)
        ->and(RecitationTiming::query()->count())->toBe(0)
        ->and(Resource::query()->where('source_key', '6')->firstOrFail()->version)->toBe(2)
        ->and($change->entity)->toBe('recitation_timing')
        ->and($change->entity_key)->toBe('10734:1')
        ->and($change->op)->toBe(ChangeOperation::Delete)
        ->and($change->version)->toBe(2)
        ->and($change->payload)->toBeNull();
});

it('still fails a row update that clears chapter_id on a file with an audio url, without advancing the sequence', function (): void {
    bootstrapChapterRecitationResource();

    $broken = audioFile(10734, 1, 10, 10000);
    $broken['chapter_id'] = null;

    expect(fn () => runContent(ResourceGroup::ChapterRecitations, 'chapter_recitations:6', reciterRoutes(), [
        contentRowMutation('chapter_recitations', 6, 11, 'ROW_UPDATE', '10734', 'chapter_audio_file', $broken),
    ], 'token-row'))->toThrow(SyncException::class, 'Sync record is missing chapter_id.');

    expect(SyncState::query()->firstOrFail()->last_sequence)->toBe(10)
        ->and(ChapterAudioFile::query()->findOrFail(10734)->chapter_id)->toBe(1)
        ->and(ContentChange::query()->count())->toBe(0);
});

it('falls back to the audio metadata artist when the reciter is not in the catalog', function (): void {
    runContent(ResourceGroup::ChapterRecitations, 'chapter_recitations:99', reciterRoutes(), [
        contentResourceMutation('chapter_recitations', 99, 10, 'RESOURCE_CREATE', '/api/v4/resources/snapshots/chapter_recitations/99'),
    ], 'token-fallback', extra: [
        CONTENT_HOST.'/api/v4/resources/snapshots/chapter_recitations/99' => contentSnapshot('chapter_recitations', 99, [
            audioFile(200, 1, 78, 78000, 'Abdul Basit Abdul Samad'),
        ]),
    ]);

    $recitation = Recitation::query()->firstOrFail();

    expect($recitation->reciter_name)->toBe('Abdul Basit Abdul Samad')
        ->and($recitation->reciter_name_ar)->toBeNull()
        ->and($recitation->style)->toBeNull()
        ->and($recitation->qirat)->toBeNull()
        ->and($recitation->has_word_segments)->toBeFalse()
        ->and(Resource::query()->where('source_key', '99')->value('name'))->toBe('Abdul Basit Abdul Samad');
});

it('stores a configured Arabic reciter name over the QF Arabic name', function (): void {
    config()->set('quran.reciter_display_names.ar', [6 => 'اسم تجريبي ١']);

    runContent(ResourceGroup::ChapterRecitations, 'chapter_recitations:6', reciterRoutesWithArabicName('محمود خليل الحصري'), [
        contentResourceMutation('chapter_recitations', 6, 10, 'RESOURCE_CREATE', '/api/v4/resources/snapshots/chapter_recitations/6'),
    ], 'token-override');

    expect(Recitation::query()->firstOrFail()->reciter_name_ar)->toBe('اسم تجريبي ١');
});

it('applies a configured Arabic reciter name when the English catalogue has no entry', function (): void {
    config()->set('quran.reciter_display_names.ar', [99 => 'اسم تجريبي ٢']);

    runContent(ResourceGroup::ChapterRecitations, 'chapter_recitations:99', reciterRoutes(), [
        contentResourceMutation('chapter_recitations', 99, 10, 'RESOURCE_CREATE', '/api/v4/resources/snapshots/chapter_recitations/99'),
    ], 'token-override-fallback', extra: [
        CONTENT_HOST.'/api/v4/resources/snapshots/chapter_recitations/99' => contentSnapshot('chapter_recitations', 99, [
            audioFile(200, 1, 78, 78000, 'Abdul Basit Abdul Samad'),
        ]),
    ]);

    expect(Recitation::query()->firstOrFail()->reciter_name_ar)->toBe('اسم تجريبي ٢');
});

it('stores a Latin-only QF Arabic reciter name as null and keeps it off the resource', function (): void {
    runContent(ResourceGroup::ChapterRecitations, 'chapter_recitations:6', reciterRoutesWithArabicName('Bandar Baleela'), [
        contentResourceMutation('chapter_recitations', 6, 10, 'RESOURCE_CREATE', '/api/v4/resources/snapshots/chapter_recitations/6'),
    ], 'token-latin');

    expect(Recitation::query()->firstOrFail()->reciter_name_ar)->toBeNull()
        ->and(Resource::query()->where('source_key', '6')->value('name_ar'))->toBeNull();
});

it('stores a QF Arabic reciter name with Arabic letters unchanged', function (): void {
    $arabic = 'محمود خليل الحصري (المعلم)';

    runContent(ResourceGroup::ChapterRecitations, 'chapter_recitations:6', reciterRoutesWithArabicName($arabic), [
        contentResourceMutation('chapter_recitations', 6, 10, 'RESOURCE_CREATE', '/api/v4/resources/snapshots/chapter_recitations/6'),
    ], 'token-arabic');

    expect(Recitation::query()->firstOrFail()->reciter_name_ar)->toBe($arabic);
});

function bootstrapChapterRecitationResource(): void
{
    runContent(ResourceGroup::ChapterRecitations, 'chapter_recitations:6', reciterRoutes(), [
        contentResourceMutation('chapter_recitations', 6, 10, 'RESOURCE_CREATE', '/api/v4/resources/snapshots/chapter_recitations/6'),
    ]);
}

/**
 * @param  array<string, mixed>  $routes
 * @param  list<array<string, mixed>>  $mutations
 * @param  array<string, mixed>  $extra
 */
function runContent(
    ResourceGroup $group,
    string $filter,
    array $routes,
    array $mutations,
    string $token = 'token-final',
    ResponseSequence|array|null $sync = null,
    array $extra = [],
): void {
    fakeContent([
        ...$routes,
        ...$extra,
        'sync' => $sync ?? contentPage($mutations, $token),
    ]);

    app(ContentSyncService::class)->run($group, $filter);
}

/**
 * @param  array<string, mixed>  $routes
 */
function fakeContent(array $routes): void
{
    Http::swap(new Factory);
    Http::preventStrayRequests();

    $sync = $routes['sync'] ?? contentPage([]);
    unset($routes['sync']);

    $map = [
        'https://prelive-oauth2.quran.foundation/oauth2/token' => Http::response(QuranFoundationFixture::load('token.json')),
        CONTENT_HOST.'/api/v4/resources/sync*' => $sync instanceof ResponseSequence
            ? $sync
            : Http::response(is_array($sync) ? $sync : []),
    ];

    foreach ($routes as $url => $body) {
        if (! is_string($url)) {
            continue;
        }

        $map[$url] = $body instanceof ResponseSequence || $body instanceof Response
            ? $body
            : Http::response(is_array($body) ? $body : []);
    }

    Http::fake($map);
}

/**
 * @param  list<array<string, mixed>>  $records
 * @return array<string, mixed>
 */
function contentSnapshot(string $group, int $resourceId, array $records): array
{
    return [
        'resource_group' => $group,
        'resource_id' => $resourceId,
        'resource_content_id' => $resourceId,
        'schema_version' => 1,
        'sync_sequence' => 42,
        'records' => $records,
    ];
}

/**
 * @param  list<array<string, mixed>>  $mutations
 * @return array<string, mixed>
 */
function contentPage(array $mutations, string $token = 'token-final', bool $hasMore = false, ?string $next = null): array
{
    return [
        'sync' => [
            'sync_until_sequence' => 1000,
            'has_more' => $hasMore,
            'next_page_url' => $next,
            'next_sync_token' => $token,
            'mutations' => $mutations,
        ],
    ];
}

/**
 * @return array<string, mixed>
 */
function contentResourceMutation(string $group, int $resourceId, int $sequence, string $type, ?string $snapshotUrl): array
{
    return [
        'sequence' => $sequence,
        'type' => $type,
        'resource_group' => $group,
        'resource_id' => $resourceId,
        'resource_content_id' => $resourceId,
        'record_type' => null,
        'record_key' => null,
        'source_record_id' => null,
        'changed_at' => '2026-10-27T12:00:00.000Z',
        'data' => null,
        'snapshot_url' => $snapshotUrl,
        'unavailable_reason' => null,
    ];
}

/**
 * @param  array<string, mixed>|null  $data
 * @return array<string, mixed>
 */
function contentRowMutation(string $group, int $resourceId, int $sequence, string $type, string $recordKey, ?string $recordType, ?array $data): array
{
    return [
        'sequence' => $sequence,
        'type' => $type,
        'resource_group' => $group,
        'resource_id' => $resourceId,
        'resource_content_id' => $resourceId,
        'record_type' => $recordType,
        'record_key' => $recordKey,
        'source_record_id' => null,
        'changed_at' => '2026-10-27T12:00:00.000Z',
        'data' => $data,
        'snapshot_url' => null,
        'unavailable_reason' => null,
    ];
}

/**
 * @return array<string, mixed>
 */
function tafsirRecord(int $groupId, string $text, int $verseId = 1): array
{
    return [
        'id' => $groupId,
        'verse_id' => $verseId,
        'verse_key' => '1:'.$verseId,
        'group_verse_key_from' => '1:1',
        'group_verse_key_to' => '1:1',
        'group_verses_count' => 1,
        'group_tafsir_id' => $groupId,
        'start_verse_id' => 1,
        'end_verse_id' => 1,
        'text' => $text,
        'resource_id' => 169,
    ];
}

/**
 * @return array<string, mixed>
 */
function tafsirRoutes(string $text): array
{
    return [
        CONTENT_HOST.'/api/v4/resources/tafsirs?language=ar' => ['tafsirs' => []],
        CONTENT_HOST.'/api/v4/resources/tafsirs' => [
            'tafsirs' => [[
                'id' => 169,
                'name' => 'Sample tafsir',
                'author_name' => null,
                'slug' => 'sample',
                'language_name' => 'arabic',
            ]],
        ],
        CONTENT_HOST.'/api/v4/resources/snapshots/tafsirs/169' => contentSnapshot('tafsirs', 169, [
            tafsirRecord(82641, $text),
        ]),
    ];
}

/**
 * @return list<array<string, mixed>>
 */
function mushafRecords(string $glyph): array
{
    return [
        mushafRecord('QCF V2'),
        mushafPage(1, ['1' => '1-7']),
        mushafPage(2, ['2' => '8-14']),
        mushafWord(1, $glyph),
        mushafWord(2, 'b'),
        mushafWord(3, 'c'),
    ];
}

/**
 * @return array<string, mixed>
 */
function mushafRecord(string $name): array
{
    return [
        'record_type' => 'mushaf',
        'id' => 1,
        'name' => $name,
        'description' => 'QCF V2',
        'pages_count' => 604,
        'lines_per_page' => 15,
        'default_font_name' => 'v2',
        'mapping_mode' => 'reference',
        'qirat' => ['id' => 1, 'name' => 'Hafs'],
    ];
}

/**
 * @param  array<string, string>  $mapping
 * @return array<string, mixed>
 */
function mushafPage(int $pageNumber, array $mapping): array
{
    return [
        'record_type' => 'mushaf_page',
        'id' => 600 + $pageNumber,
        'mushaf_id' => 1,
        'page_number' => $pageNumber,
        'first_verse_id' => $pageNumber === 1 ? 1 : 8,
        'last_verse_id' => $pageNumber === 1 ? 7 : 10,
        'first_word_id' => $pageNumber === 1 ? 1 : 4,
        'last_word_id' => $pageNumber === 1 ? 3 : 6,
        'verses_count' => $pageNumber === 1 ? 7 : 3,
        'verse_mapping' => $mapping,
    ];
}

/**
 * @return array<string, mixed>
 */
function mushafWord(int $wordId, string $glyph): array
{
    return [
        'record_type' => 'mushaf_word',
        'id' => 529416 + $wordId,
        'mushaf_id' => 1,
        'word_id' => $wordId,
        'verse_id' => 1,
        'text' => $glyph,
        'char_type_id' => 1,
        'char_type_name' => 'word',
        'page_number' => 1,
        'line_number' => 9,
        'position_in_verse' => 1,
        'position_in_line' => 1,
        'position_in_page' => 1,
    ];
}

/**
 * @return array<string, mixed>
 */
function reciterRoutes(): array
{
    return [
        CONTENT_HOST.'/api/v4/resources/chapter_reciters' => [
            'reciters' => [[
                'id' => 6,
                'name' => 'Mahmoud Khaleel Al-Husary',
                'style' => ['name' => 'Murattal'],
                'qirat' => ['name' => 'Hafs'],
            ]],
        ],
        CONTENT_HOST.'/api/v4/resources/chapter_reciters?language=ar' => [
            'reciters' => [[
                'id' => 6,
                'name' => 'Mahmoud Khaleel Al-Husary',
                'translated_name' => ['name' => 'محمود خليل الحصري'],
            ]],
        ],
        CONTENT_HOST.'/api/v4/resources/snapshots/chapter_recitations/6' => contentSnapshot('chapter_recitations', 6, [
            audioFile(10734, 1, 78, 78000, 'Ignored Artist', 1595520.0),
            audioSegment(1, [[1, 0.0, 960.0], [2, 970.0, 1420.0], [9, 1, 2, 3], [3, 500.0, 100.0]]),
        ]),
    ];
}

/**
 * @return array<string, mixed>
 */
function reciterRoutesWithArabicName(string $translatedName): array
{
    $routes = reciterRoutes();
    $routes[CONTENT_HOST.'/api/v4/resources/chapter_reciters?language=ar'] = [
        'reciters' => [[
            'id' => 6,
            'name' => 'Mahmoud Khaleel Al-Husary',
            'translated_name' => ['name' => $translatedName],
        ]],
    ];

    return $routes;
}

/**
 * @return array<string, mixed>
 */
function audioFile(int $id, int $chapterId, int $duration, int $durationMs, ?string $artist = null, float|int|null $fileSize = null): array
{
    return [
        'record_type' => 'chapter_audio_file',
        'id' => $id,
        'audio_recitation_id' => 1,
        'chapter_id' => $chapterId,
        'audio_url' => 'https://download.quranicaudio.com/qdc/abdul_baset/mujawwad/1.mp3',
        'duration' => $duration,
        'duration_ms' => $durationMs,
        'file_size' => $fileSize,
        'format' => 'mp3',
        'metadata' => $artist === null ? null : ['artist' => $artist],
    ];
}

/**
 * @param  list<list<float|int>>  $segments
 * @return array<string, mixed>
 */
function audioSegment(int $verseId, array $segments): array
{
    return [
        'record_type' => 'audio_segment',
        'id' => $verseId,
        'audio_file_id' => 10734,
        'chapter_id' => 1,
        'verse_id' => $verseId,
        'verse_key' => '1:'.$verseId,
        'timestamp_from' => 0,
        'timestamp_to' => 6300,
        'duration_ms' => 6,
        'segments' => $segments,
    ];
}

it('keeps Taybah sets and rows when a QF snapshot replaces the files', function (): void {
    bootstrapChapterRecitationResource();
    taybahSetFor(ChapterAudioFile::query()->findOrFail(10734));
    $setsBefore = TaybahTimingSet::query()->get()->toArray();
    $rowsBefore = TaybahRecitationTiming::query()->orderBy('verse_id')->get()->toArray();

    runContent(ResourceGroup::ChapterRecitations, 'chapter_recitations:6', reciterRoutes(), [
        contentResourceMutation('chapter_recitations', 6, 11, 'RESOURCE_INVALIDATE', '/api/v4/resources/snapshots/chapter_recitations/6'),
    ]);

    expect(ChapterAudioFile::query()->pluck('id')->all())->toBe([10734])
        ->and(TaybahTimingSet::query()->get()->toArray())->toEqual($setsBefore)
        ->and(TaybahRecitationTiming::query()->orderBy('verse_id')->get()->toArray())->toEqual($rowsBefore);
});

it('keeps has_word_segments true for an untrusted reciter that has served Taybah segments', function (): void {
    config(['quran.untrusted_timing_recitations' => [6]]);
    bootstrapChapterRecitationResource();
    taybahSetFor(ChapterAudioFile::query()->findOrFail(10734));

    runContent(ResourceGroup::ChapterRecitations, 'chapter_recitations:6', reciterRoutes(), [
        contentResourceMutation('chapter_recitations', 6, 11, 'RESOURCE_INVALIDATE', '/api/v4/resources/snapshots/chapter_recitations/6'),
    ]);

    expect(RecitationTiming::query()->count())->toBe(0)
        ->and(Recitation::query()->sole()->has_word_segments)->toBeTrue();
});

it('sets has_word_segments false when the Taybah set has no segments and the reciter is untrusted', function (): void {
    config(['quran.untrusted_timing_recitations' => [6]]);
    bootstrapChapterRecitationResource();
    taybahSetFor(ChapterAudioFile::query()->findOrFail(10734), withSegments: false);

    runContent(ResourceGroup::ChapterRecitations, 'chapter_recitations:6', reciterRoutes(), [
        contentResourceMutation('chapter_recitations', 6, 11, 'RESOURCE_INVALIDATE', '/api/v4/resources/snapshots/chapter_recitations/6'),
    ]);

    expect(Recitation::query()->sole()->has_word_segments)->toBeFalse();
});

it('drops the flag when a file url change makes the Taybah set stale', function (): void {
    config(['quran.untrusted_timing_recitations' => [6]]);
    bootstrapChapterRecitationResource();
    taybahSetFor(ChapterAudioFile::query()->findOrFail(10734));
    app(RecitationSegmentsFlagService::class)->refresh(Recitation::query()->sole()->id);
    expect(Recitation::query()->sole()->has_word_segments)->toBeTrue();

    $moved = audioFile(10734, 1, 78, 78000, null, 1595520.0);
    $moved['audio_url'] = 'https://download.quranicaudio.com/qdc/abdul_baset/mujawwad/2.mp3';

    runContent(ResourceGroup::ChapterRecitations, 'chapter_recitations:6', reciterRoutes(), [
        contentRowMutation('chapter_recitations', 6, 11, 'ROW_UPDATE', '10734', 'chapter_audio_file', $moved),
    ], 'token-row');

    expect(Recitation::query()->sole()->has_word_segments)->toBeFalse()
        ->and(TaybahTimingSet::query()->count())->toBe(1)
        ->and(TaybahRecitationTiming::query()->count())->toBe(1);
});

it('leaves Taybah rows alone when a QF audio_segment is created, updated or deleted', function (): void {
    bootstrapChapterRecitationResource();
    taybahSetFor(ChapterAudioFile::query()->findOrFail(10734));
    $setsBefore = TaybahTimingSet::query()->get()->toArray();
    $rowsBefore = TaybahRecitationTiming::query()->orderBy('verse_id')->get()->toArray();

    runContent(ResourceGroup::ChapterRecitations, 'chapter_recitations:6', reciterRoutes(), [
        contentRowMutation('chapter_recitations', 6, 11, 'ROW_CREATE', '10734:2', 'audio_segment', audioSegment(2, [[4, 1.2, 3.8]])),
        contentRowMutation('chapter_recitations', 6, 12, 'ROW_UPDATE', '10734:1', 'audio_segment', audioSegment(1, [[1, 0.0, 900.0]])),
        contentRowMutation('chapter_recitations', 6, 13, 'ROW_DELETE', '10734:2', 'audio_segment', null),
    ], 'token-row');

    expect(TaybahTimingSet::query()->get()->toArray())->toEqual($setsBefore)
        ->and(TaybahRecitationTiming::query()->orderBy('verse_id')->get()->toArray())->toEqual($rowsBefore);
});

it('stores the QF timing but writes no change row and no version bump when a served Taybah set covers the file', function (): void {
    bootstrapChapterRecitationResource();
    taybahSetFor(ChapterAudioFile::query()->findOrFail(10734));
    $changesBefore = ContentChange::query()->count();
    $versionBefore = Resource::query()->where('source_key', '6')->firstOrFail()->version;

    runContent(ResourceGroup::ChapterRecitations, 'chapter_recitations:6', reciterRoutes(), [
        contentRowMutation('chapter_recitations', 6, 11, 'ROW_CREATE', '10734:2', 'audio_segment', audioSegment(2, [[4, 1.2, 3.8]])),
    ], 'token-row');

    expect(RecitationTiming::query()->where('audio_file_id', 10734)->where('verse_id', 2)->exists())->toBeTrue()
        ->and(ContentChange::query()->count())->toBe($changesBefore)
        ->and(Resource::query()->where('source_key', '6')->firstOrFail()->version)->toBe($versionBefore)
        ->and(SyncRun::query()->latest('id')->firstOrFail()->status)->toBe(SyncRunStatus::Ok);
});

it('writes the change row and bumps the version when no Taybah set covers the file', function (): void {
    bootstrapChapterRecitationResource();
    $changesBefore = ContentChange::query()->count();
    $versionBefore = Resource::query()->where('source_key', '6')->firstOrFail()->version;

    runContent(ResourceGroup::ChapterRecitations, 'chapter_recitations:6', reciterRoutes(), [
        contentRowMutation('chapter_recitations', 6, 11, 'ROW_CREATE', '10734:2', 'audio_segment', audioSegment(2, [[4, 1.2, 3.8]])),
    ], 'token-row');

    expect(ContentChange::query()->count())->toBe($changesBefore + 1)
        ->and(Resource::query()->where('source_key', '6')->firstOrFail()->version)->toBe($versionBefore + 1);
});

it('leaves Taybah rows alone when a chapter_audio_file is deleted by a QF mutation', function (): void {
    bootstrapChapterRecitationResource();
    taybahSetFor(ChapterAudioFile::query()->findOrFail(10734));

    runContent(ResourceGroup::ChapterRecitations, 'chapter_recitations:6', reciterRoutes(), [
        contentRowMutation('chapter_recitations', 6, 11, 'ROW_DELETE', '10734', 'chapter_audio_file', null),
    ], 'token-row');

    expect(ChapterAudioFile::query()->whereKey(10734)->exists())->toBeFalse()
        ->and(TaybahTimingSet::query()->count())->toBe(1)
        ->and(TaybahRecitationTiming::query()->count())->toBe(1)
        ->and(Recitation::query()->sole()->has_word_segments)->toBeFalse();
});

it('does not touch a recitation owned by another source during a QF sync', function (): void {
    $source = ContentSource::query()->updateOrCreate(['code' => 'mp3quran'], [
        'name' => 'MP3Quran',
        'licence_url' => 'https://example.test/licence',
        'attribution_ar' => 'إسناد',
        'attribution_en' => 'Attribution',
        'permission_status' => PermissionStatus::Granted,
    ]);
    $resource = Resource::factory()->create([
        'source_id' => $source->id,
        'group' => ResourceGroup::ChapterRecitations,
        'source_key' => '6',
        'version' => 9,
    ]);
    $recitation = Recitation::factory()->create(['resource_id' => $resource->id, 'has_word_segments' => true]);
    $file = ChapterAudioFile::factory()->create([
        'id' => 99001,
        'recitation_id' => $recitation->id,
        'chapter_id' => 1,
        'audio_url' => 'https://mp3.example.test/6/001.mp3',
    ]);
    taybahSetFor($file);

    $before = [
        'resource' => $resource->fresh()->getAttributes(),
        'recitation' => $recitation->fresh()->getAttributes(),
        'file' => $file->fresh()->getAttributes(),
        'sets' => TaybahTimingSet::query()->get()->toArray(),
        'rows' => TaybahRecitationTiming::query()->orderBy('verse_id')->get()->toArray(),
    ];

    bootstrapChapterRecitationResource();

    $qfResource = Resource::query()->where('source_id', '!=', $source->id)->where('source_key', '6')->sole();

    expect([
        'resource' => $resource->fresh()->getAttributes(),
        'recitation' => $recitation->fresh()->getAttributes(),
        'file' => $file->fresh()->getAttributes(),
        'sets' => TaybahTimingSet::query()->get()->toArray(),
        'rows' => TaybahRecitationTiming::query()->orderBy('verse_id')->get()->toArray(),
    ])->toEqual($before)
        ->and(Resource::query()->findOrFail($resource->id)->version)->toBe(9)
        ->and(Recitation::query()->where('resource_id', $qfResource->id)->exists())->toBeTrue()
        ->and(ChapterAudioFile::query()->whereKey(10734)->where('recitation_id', '!=', $recitation->id)->exists())->toBeTrue();
});

it('leaves imported MP3Quran recitations untouched by a QF sync', function (): void {
    require_once __DIR__.'/../../Support/Mp3QuranTestManifest.php';

    mp3QuranTestManifest([mp3QuranTestMoshaf(6, [1, 2])]);
    app(Mp3QuranImporter::class)->import(deferPack: true);

    $mp3Resource = Resource::query()->where('source_key', '6')->where('group', ResourceGroup::ChapterRecitations)
        ->whereHas('source', fn ($query) => $query->where('code', 'mp3quran'))
        ->sole();
    $mp3Recitation = Recitation::query()->where('resource_id', $mp3Resource->id)->sole();
    $mp3File = ChapterAudioFile::query()->whereKey(Mp3QuranFileId::for(6, 1))->sole();
    taybahSetFor($mp3File);
    $mp3FileIds = fn (): array => ChapterAudioFile::query()->where('recitation_id', $mp3Recitation->id)->pluck('id')->all();

    $before = [
        'resource' => $mp3Resource->fresh()->getAttributes(),
        'recitation' => $mp3Recitation->fresh()->getAttributes(),
        'files' => ChapterAudioFile::query()->where('recitation_id', $mp3Recitation->id)->orderBy('id')->get()->toArray(),
        'timings' => RecitationTiming::query()->whereIn('audio_file_id', $mp3FileIds())->orderBy('audio_file_id')->orderBy('verse_id')->get()->toArray(),
        'sets' => TaybahTimingSet::query()->get()->toArray(),
        'rows' => TaybahRecitationTiming::query()->orderBy('verse_id')->get()->toArray(),
    ];

    bootstrapChapterRecitationResource();

    $qfResource = Resource::query()->where('source_id', '!=', $mp3Resource->source_id)->where('source_key', '6')->sole();

    expect([
        'resource' => $mp3Resource->fresh()->getAttributes(),
        'recitation' => $mp3Recitation->fresh()->getAttributes(),
        'files' => ChapterAudioFile::query()->where('recitation_id', $mp3Recitation->id)->orderBy('id')->get()->toArray(),
        'timings' => RecitationTiming::query()->whereIn('audio_file_id', $mp3FileIds())->orderBy('audio_file_id')->orderBy('verse_id')->get()->toArray(),
        'sets' => TaybahTimingSet::query()->get()->toArray(),
        'rows' => TaybahRecitationTiming::query()->orderBy('verse_id')->get()->toArray(),
    ])->toEqual($before)
        ->and(Recitation::query()->where('resource_id', $qfResource->id)->exists())->toBeTrue()
        ->and(ChapterAudioFile::query()->whereKey(10734)->where('recitation_id', '!=', $mp3Recitation->id)->exists())->toBeTrue();
});

/**
 * A Taybah timing set for the file's recitation and chapter at the file's current URL, with one verse 1 row.
 */
function taybahSetFor(ChapterAudioFile $file, bool $withSegments = true): TaybahTimingSet
{
    $set = TaybahTimingSet::factory()->create([
        'recitation_id' => $file->recitation_id,
        'chapter_id' => $file->chapter_id,
        'audio_url' => $file->audio_url,
    ]);

    TaybahRecitationTiming::factory()->create([
        'recitation_id' => $file->recitation_id,
        'chapter_id' => $file->chapter_id,
        'verse_id' => 1,
        'start_ms' => 0,
        'end_ms' => 500,
        'segments' => $withSegments ? [[1, 0, 500]] : null,
    ]);

    return $set;
}
