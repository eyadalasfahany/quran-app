<?php

declare(strict_types=1);

require_once __DIR__.'/../../Support/Mp3QuranTestManifest.php';

use App\Domains\Content\Enums\PermissionStatus;
use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Events\ResourceContentChanged;
use App\Domains\Content\Jobs\BuildContentPackJob;
use App\Domains\Content\Models\ChapterAudioFile;
use App\Domains\Content\Models\ContentPack;
use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Mushaf;
use App\Domains\Content\Models\MushafPage;
use App\Domains\Content\Models\Recitation;
use App\Domains\Content\Models\RecitationTiming;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Models\TafsirEntry;
use App\Domains\Content\Models\TaybahRecitationTiming;
use App\Domains\Content\Models\TaybahTimingSet;
use App\Domains\Content\Models\WordLayout;
use App\Domains\Content\Mp3Quran\Mp3QuranFileId;
use App\Domains\Content\Packs\PackBuilder;
use App\Domains\Content\Packs\PackBuildException;
use App\Domains\Content\Services\Mp3QuranImporter;
use App\Support\QuranText\ChapterVerseCounts;
use Illuminate\Filesystem\Filesystem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Http::preventStrayRequests();
    Storage::fake('local');
});

it('writes a gzipped sqlite pack whose hash, size, and tafsir html rows match the database', function (): void {
    $resource = Resource::factory()->create([
        'group' => ResourceGroup::Tafsirs,
        'version' => 3,
        'name' => 'Exact',
    ]);
    $exact = "<p>بِسْمِ ٱللَّهِ \u{200F} </p>";

    $rows = [];

    for ($groupTafsirId = 1; $groupTafsirId <= 1001; $groupTafsirId++) {
        $html = $groupTafsirId === 1 ? $exact : '<p>tafsir '.$groupTafsirId.'</p>';
        $rows[] = [
            'resource_id' => $resource->id,
            'group_tafsir_id' => $groupTafsirId,
            'first_verse_id' => $groupTafsirId,
            'last_verse_id' => $groupTafsirId,
            'first_verse_key' => '1:1',
            'last_verse_key' => '1:1',
            'html' => $html,
            'source_hash' => hash('sha256', $html),
        ];
    }

    foreach (array_chunk($rows, 500) as $chunk) {
        DB::table('tafsir_entries')->insert($chunk);
    }

    $pack = app(PackBuilder::class)->build($resource);

    expect(Storage::disk('local')->exists($pack->path))->toBeTrue();

    $gzipped = Storage::disk('local')->get($pack->path);
    expect($gzipped)->toBeString()
        ->and(strlen($gzipped))->toBe($pack->sizeBytes)
        ->and(hash('sha256', $gzipped))->toBe($pack->sha256)
        ->and(ContentPack::query()->where('resource_id', $resource->id)->where('version', 3)->first())
        ->not->toBeNull()
        ->and(ContentPack::query()->first()?->size_bytes)->toBe($pack->sizeBytes)
        ->and(ContentPack::query()->first()?->sha256)->toBe($pack->sha256)
        ->and(ContentPack::query()->first()?->row_count)->toBe(1001)
        ->and(ContentPack::query()->first()?->schema_version)->toBe(1);

    $storedHtml = DB::table('tafsir_entries')->where('group_tafsir_id', 1)->value('html');

    expect($storedHtml)->toBeString()
        ->and(bin2hex($storedHtml))->toBe(bin2hex($exact));

    withContentPack($gzipped, function (PDO $pdo) use ($exact, $resource): void {
        $tables = $pdo->query("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")->fetchAll(PDO::FETCH_COLUMN);
        expect($tables)->toBe(['meta', 'tafsir_entries']);

        $meta = $pdo->query('SELECT key, value FROM meta ORDER BY key')->fetchAll();
        expect(array_column($meta, 'value', 'key'))->toMatchArray([
            'pack_schema_version' => '1',
            'resource_id' => (string) $resource->id,
            'group' => 'tafsirs',
            'version' => '3',
        ]);

        expectPackTable($pdo, 'tafsir_entries', [
            'resource_id' => 'INTEGER',
            'group_tafsir_id' => 'INTEGER',
            'first_verse_id' => 'INTEGER',
            'last_verse_id' => 'INTEGER',
            'html' => 'TEXT',
        ], ['resource_id', 'group_tafsir_id']);

        expect((int) $pdo->query('SELECT COUNT(*) FROM tafsir_entries')->fetchColumn())->toBe(1001);

        $row = $pdo->query('SELECT html FROM tafsir_entries WHERE group_tafsir_id = 1')->fetch();
        expect($row)->toBeArray()
            ->and(bin2hex((string) $row['html']))->toBe(bin2hex($exact));
    });
});

it('copies tafsir columns from the shared contract', function (): void {
    $entry = TafsirEntry::factory()->create([
        'html' => '<p>تفسير</p>',
        'first_verse_id' => 1,
        'last_verse_id' => 7,
    ]);
    $resource = $entry->resource;
    $resource->version = 1;
    $resource->save();

    $gzipped = Storage::disk('local')->get(app(PackBuilder::class)->build($resource)->path);
    expect($gzipped)->toBeString();

    withContentPack($gzipped, function (PDO $pdo) use ($entry): void {
        expectPackTable($pdo, 'tafsir_entries', [
            'resource_id' => 'INTEGER',
            'group_tafsir_id' => 'INTEGER',
            'first_verse_id' => 'INTEGER',
            'last_verse_id' => 'INTEGER',
            'html' => 'TEXT',
        ], ['resource_id', 'group_tafsir_id']);

        $row = $pdo->query('SELECT * FROM tafsir_entries')->fetch();
        expect($row)->toBeArray()
            ->and((int) $row['group_tafsir_id'])->toBe($entry->group_tafsir_id)
            ->and((int) $row['first_verse_id'])->toBe(1)
            ->and((int) $row['last_verse_id'])->toBe(7)
            ->and($row['html'])->toBe('<p>تفسير</p>')
            ->and(array_key_exists('source_hash', $row))->toBeFalse();
    });
});

it('copies mushaf columns from the shared contract', function (): void {
    $mushaf = Mushaf::factory()->create([
        'name' => 'Madani',
        'pages_count' => 604,
        'lines_per_page' => 15,
        'default_font_name' => null,
    ]);
    MushafPage::query()->create([
        'mushaf_id' => $mushaf->id,
        'page_number' => 1,
        'first_verse_id' => 1,
        'last_verse_id' => 7,
        'first_word_id' => 1,
        'last_word_id' => 20,
        'verses_count' => 7,
        'verse_mapping' => ['1' => '1-7'],
    ]);
    WordLayout::factory()->create([
        'mushaf_id' => $mushaf->id,
        'word_id' => 4,
        'glyph' => 'ٱ',
        'char_type' => 'word',
    ]);
    $resource = $mushaf->resource;
    $resource->version = 1;
    $resource->save();

    $gzipped = Storage::disk('local')->get(app(PackBuilder::class)->build($resource)->path);
    expect($gzipped)->toBeString();

    $mapping = DB::table('mushaf_pages')->where('mushaf_id', $mushaf->id)->value('verse_mapping');
    $glyph = DB::table('word_layouts')->where('word_id', 4)->value('glyph');

    withContentPack($gzipped, function (PDO $pdo) use ($mushaf, $mapping, $glyph): void {
        expectPackTable($pdo, 'mushafs', [
            'id' => 'INTEGER',
            'resource_id' => 'INTEGER',
            'name' => 'TEXT',
            'pages_count' => 'INTEGER',
            'lines_per_page' => 'INTEGER',
            'default_font_name' => 'TEXT',
        ], ['id']);
        expectPackTable($pdo, 'mushaf_pages', [
            'mushaf_id' => 'INTEGER',
            'page_number' => 'INTEGER',
            'first_verse_id' => 'INTEGER',
            'last_verse_id' => 'INTEGER',
            'first_word_id' => 'INTEGER',
            'last_word_id' => 'INTEGER',
            'verse_mapping' => 'TEXT',
        ], ['mushaf_id', 'page_number']);
        expectPackTable($pdo, 'word_layouts', [
            'mushaf_id' => 'INTEGER',
            'word_id' => 'INTEGER',
            'verse_id' => 'INTEGER',
            'position_in_verse' => 'INTEGER',
            'char_type' => 'TEXT',
            'glyph' => 'TEXT',
            'page' => 'INTEGER',
            'line' => 'INTEGER',
            'position_in_line' => 'INTEGER',
        ], ['mushaf_id', 'word_id']);

        $page = $pdo->query('SELECT verse_mapping FROM mushaf_pages')->fetch();
        $word = $pdo->query('SELECT glyph FROM word_layouts')->fetch();
        expect($page)->toBeArray()
            ->and($page['verse_mapping'])->toBe($mapping)
            ->and($word)->toBeArray()
            ->and(is_string($glyph) ? bin2hex((string) $word['glyph']) : null)->toBe(is_string($glyph) ? bin2hex($glyph) : null)
            ->and((int) $pdo->query('SELECT COUNT(*) FROM mushafs')->fetchColumn())->toBe(1)
            ->and((int) $pdo->query('SELECT id FROM mushafs')->fetchColumn())->toBe($mushaf->id);
    });
});

it('copies chapter recitation columns from the shared contract', function (): void {
    $recitation = Recitation::factory()->create([
        'reciter_name' => 'Mishary',
        'reciter_name_ar' => 'مشاري',
        'style' => 'murattal',
        'qirat' => 'hafs',
        'has_word_segments' => false,
    ]);
    $audio = ChapterAudioFile::factory()->create([
        'recitation_id' => $recitation->id,
        'chapter_id' => 1,
        'audio_url' => 'https://audio.example/1.mp3',
        'size_bytes' => 2048,
        'duration_ms' => 1000,
        'format' => 'mp3',
    ]);
    RecitationTiming::query()->create([
        'audio_file_id' => $audio->id,
        'verse_id' => 1,
        'verse_key' => '1:1',
        'start_ms' => 0,
        'end_ms' => 500,
        'segments' => [[0, 100]],
    ]);
    $resource = $recitation->resource;
    $resource->version = 1;
    $resource->save();

    $gzipped = Storage::disk('local')->get(app(PackBuilder::class)->build($resource)->path);
    expect($gzipped)->toBeString();

    $segments = DB::table('recitation_timings')->value('segments');

    withContentPack($gzipped, function (PDO $pdo) use ($recitation, $audio, $segments): void {
        expectPackTable($pdo, 'recitations', [
            'id' => 'INTEGER',
            'resource_id' => 'INTEGER',
            'reciter_name' => 'TEXT',
            'reciter_name_ar' => 'TEXT',
            'style' => 'TEXT',
            'qirat' => 'TEXT',
            'has_word_segments' => 'INTEGER',
        ], ['id']);
        expectPackTable($pdo, 'chapter_audio_files', [
            'id' => 'INTEGER',
            'recitation_id' => 'INTEGER',
            'chapter_id' => 'INTEGER',
            'audio_url' => 'TEXT',
            'size_bytes' => 'INTEGER',
            'duration_ms' => 'INTEGER',
            'format' => 'TEXT',
        ], ['id']);
        expectPackTable($pdo, 'recitation_timings', [
            'audio_file_id' => 'INTEGER',
            'verse_id' => 'INTEGER',
            'start_ms' => 'INTEGER',
            'end_ms' => 'INTEGER',
            'segments' => 'TEXT',
        ], ['audio_file_id', 'verse_id']);

        $timing = $pdo->query('SELECT * FROM recitation_timings')->fetch();
        $file = $pdo->query('SELECT audio_url, size_bytes FROM chapter_audio_files')->fetch();
        expect($timing)->toBeArray()
            ->and((int) $timing['audio_file_id'])->toBe($audio->id)
            ->and($timing['segments'])->toBe($segments)
            ->and(array_key_exists('verse_key', $timing))->toBeFalse()
            ->and($file)->toBeArray()
            ->and($file['audio_url'])->toBe('https://audio.example/1.mp3')
            ->and((int) $pdo->query('SELECT has_word_segments FROM recitations')->fetchColumn())->toBe(0)
            ->and((int) $pdo->query('SELECT id FROM recitations')->fetchColumn())->toBe($recitation->id);
    });
});

it('does not rebuild a pack that already exists for the version', function (): void {
    $resource = Resource::factory()->create([
        'group' => ResourceGroup::Tafsirs,
        'version' => 2,
    ]);

    Carbon::setTestNow('2026-10-27 01:00:00');

    try {
        $first = app(PackBuilder::class)->build($resource);

        Carbon::setTestNow('2026-10-27 05:00:00');
        $second = app(PackBuilder::class)->build($resource->fresh());

        expect(ContentPack::query()->count())->toBe(1)
            ->and($second->sha256)->toBe($first->sha256)
            ->and($second->builtAt->toIso8601ZuluString('millisecond'))->toBe($first->builtAt->toIso8601ZuluString('millisecond'));
    } finally {
        Carbon::setTestNow();
    }
});

it('rebuilds a pack when the database row exists but the file on disk is gone', function (): void {
    $resource = Resource::factory()->create([
        'group' => ResourceGroup::Tafsirs,
        'version' => 2,
    ]);

    $first = app(PackBuilder::class)->build($resource);
    $path = ContentPack::query()->firstOrFail()->path;

    Storage::disk('local')->delete($path);
    expect(Storage::disk('local')->exists($path))->toBeFalse();

    Carbon::setTestNow('2026-10-27 06:00:00');

    try {
        $second = app(PackBuilder::class)->build($resource->fresh());

        expect(ContentPack::query()->count())->toBe(1)
            ->and(Storage::disk('local')->exists($path))->toBeTrue()
            ->and($second->version)->toBe($first->version)
            ->and($second->builtAt->toIso8601ZuluString('millisecond'))->toBe('2026-10-27T06:00:00.000Z');
    } finally {
        Carbon::setTestNow();
    }
});

it('leaves the previous pack and manifest unchanged when a build cannot be stored', function (): void {
    $root = storage_path('framework/testing/pack-disk-'.bin2hex(random_bytes(4)));
    mkdir($root, 0777, true);
    $locked = null;

    try {
        config(['filesystems.disks.local.root' => $root]);
        Storage::purge('local');

        $resource = Resource::factory()->create([
            'group' => ResourceGroup::Tafsirs,
            'version' => 1,
            'name' => 'Stable',
            'author_name' => 'Author',
            'language_code' => 'ar',
            'is_active' => true,
        ]);

        $first = app(PackBuilder::class)->build($resource);
        $before = $this->getJson('/api/v1/content/manifest')->json();
        $sha = ContentPack::query()->sole()->sha256;

        $resource->version = 2;
        $resource->save();

        $locked = $root.'/packs/'.$resource->id;
        expect(is_dir($locked))->toBeTrue();
        chmod($locked, 0555);

        expect(fn () => app(PackBuilder::class)->build($resource->fresh()))->toThrow(PackBuildException::class);

        chmod($locked, 0755);
        $locked = null;

        expect(ContentPack::query()->count())->toBe(1)
            ->and(ContentPack::query()->sole()->sha256)->toBe($sha)
            ->and(ContentPack::query()->sole()->version)->toBe(1)
            ->and(is_file($root.'/'.$first->path))->toBeTrue()
            ->and(is_file($root.'/packs/'.$resource->id.'/2.sqlite.gz'))->toBeFalse()
            ->and($this->getJson('/api/v1/content/manifest')->json())->toBe($before);
    } finally {
        if (is_string($locked) && is_dir($locked)) {
            chmod($locked, 0755);
        }

        (new Filesystem)->deleteDirectory($root);
    }
});

it('queues a pack build when resource content changes', function (): void {
    Queue::fake();

    ResourceContentChanged::dispatch(15, 2);

    Queue::assertPushed(BuildContentPackJob::class, function (BuildContentPackJob $job): bool {
        return $job->resourceId === 15 && $job->queue === 'packs';
    });
});

/**
 * @param  callable(PDO): void  $assert
 */
function withContentPack(string $gzipped, callable $assert): void
{
    $raw = gzdecode($gzipped);
    expect($raw)->toBeString();

    $path = tempnam(sys_get_temp_dir(), 'content-pack-');
    expect($path)->toBeString();

    try {
        file_put_contents($path, $raw);
        $pdo = new PDO('sqlite:'.$path, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        $assert($pdo);
    } finally {
        if (is_file($path)) {
            unlink($path);
        }
    }
}

/**
 * @param  array<string, string>  $columns
 * @param  list<string>  $primaryKey
 */
function expectPackTable(PDO $pdo, string $table, array $columns, array $primaryKey): void
{
    $info = $pdo->query('PRAGMA table_info('.$table.')')->fetchAll();
    expect(array_column($info, 'name'))->toBe(array_keys($columns))
        ->and(array_column($info, 'type'))->toBe(array_values($columns));

    $pk = [];

    foreach ($info as $column) {
        if ((int) $column['pk'] > 0) {
            $pk[(int) $column['pk']] = $column['name'];
        }
    }

    ksort($pk);
    expect(array_values($pk))->toBe($primaryKey);
}

it('fills a listed reciter pack with Taybah rows for the files that have a set and nothing for the others', function (): void {
    config(['quran.untrusted_timing_recitations' => [5]]);
    $resource = packTimingResource(5);
    $recitation = Recitation::factory()->create(['resource_id' => $resource->id]);
    $first = packTimingFile($recitation, 1, 'https://audio.example.test/fixture/5/001.mp3');
    packTimingFile($recitation, 2, 'https://audio.example.test/fixture/5/002.mp3');
    packTaybahSet($recitation, 1, $first->audio_url);
    packTaybahRow($recitation, 1, 1, 0, 500, [[1, 0, 500]]);
    packTaybahRow($recitation, 1, 2, 500, 1000, null);

    $rows = packTimingRows(packBuildGzip($resource));

    expect($rows)->toHaveCount(2)
        ->and(array_unique(array_column($rows, 'audio_file_id')))->toBe([(string) $first->id])
        ->and(array_column($rows, 'verse_id'))->toBe(['1', '2']);
});

it('leaves a trusted reciter with no Taybah set byte-identical', function (): void {
    $resource = packTimingResource(6);
    $recitation = Recitation::factory()->create(['resource_id' => $resource->id]);
    $first = packTimingFile($recitation, 1, 'https://audio.example.test/fixture/6/001.mp3');
    $second = packTimingFile($recitation, 2, 'https://audio.example.test/fixture/6/002.mp3');
    packOwnTiming($first, 1, 0, 500, [[1, 0, 500]]);
    packOwnTiming($first, 2, 500, 1000, null);
    packOwnTiming($second, 1, 0, 800, [[1, 0, 400], [2, 400, 800]]);

    $rows = packTimingRows(packBuildGzip($resource));
    $database = DB::table('recitation_timings')
        ->orderBy('audio_file_id')
        ->orderBy('verse_id')
        ->get(['audio_file_id', 'verse_id', 'start_ms', 'end_ms', 'segments'])
        ->map(fn (object $row): array => array_map(fn (mixed $value): ?string => $value === null ? null : (string) $value, (array) $row))
        ->all();

    expect($rows)->toHaveCount(3)
        ->and($rows)->toBe($database);
});

it('uses Taybah rows for one file and QF rows for the others of a trusted reciter', function (): void {
    $resource = packTimingResource(6);
    $recitation = Recitation::factory()->create(['resource_id' => $resource->id]);
    $taybahFile = packTimingFile($recitation, 1, 'https://audio.example.test/fixture/6/001.mp3');
    $ownFile = packTimingFile($recitation, 2, 'https://audio.example.test/fixture/6/002.mp3');
    packTaybahSet($recitation, 1, $taybahFile->audio_url);
    packTaybahRow($recitation, 1, 1, 0, 300, [[1, 0, 300]]);
    packOwnTiming($taybahFile, 1, 0, 9000, null);
    packOwnTiming($ownFile, 1, 0, 700, [[1, 0, 700]]);

    $rows = packTimingRows(packBuildGzip($resource));

    $byFile = collect($rows)->keyBy('audio_file_id');

    expect($rows)->toHaveCount(2)
        ->and($byFile[(string) $taybahFile->id])->toBe(['audio_file_id' => (string) $taybahFile->id, 'verse_id' => '1', 'start_ms' => '0', 'end_ms' => '300', 'segments' => '[[1, 0, 300]]'])
        ->and($byFile[(string) $ownFile->id])->toBe(['audio_file_id' => (string) $ownFile->id, 'verse_id' => '1', 'start_ms' => '0', 'end_ms' => '700', 'segments' => '[[1, 0, 700]]']);
});

it('leaves out a file whose Taybah set has a different audio url', function (): void {
    $trusted = packTimingResource(6);
    $trustedRecitation = Recitation::factory()->create(['resource_id' => $trusted->id]);
    $trustedFile = packTimingFile($trustedRecitation, 1, 'https://audio.example.test/fixture/6/001.mp3');
    packTaybahSet($trustedRecitation, 1, 'https://audio.example.test/fixture/6/old-001.mp3');
    packTaybahRow($trustedRecitation, 1, 1, 0, 300, [[1, 0, 300]]);
    packOwnTiming($trustedFile, 1, 0, 700, [[1, 0, 700]]);

    $untrusted = packTimingResource(5);
    config(['quran.untrusted_timing_recitations' => [5]]);
    $untrustedRecitation = Recitation::factory()->create(['resource_id' => $untrusted->id]);
    packTimingFile($untrustedRecitation, 1, 'https://audio.example.test/fixture/5/001.mp3');
    packTaybahSet($untrustedRecitation, 1, 'https://audio.example.test/fixture/5/old-001.mp3');
    packTaybahRow($untrustedRecitation, 1, 1, 0, 300, [[1, 0, 300]]);

    expect(packTimingRows(packBuildGzip($trusted)))
        ->toBe([['audio_file_id' => (string) $trustedFile->id, 'verse_id' => '1', 'start_ms' => '0', 'end_ms' => '700', 'segments' => '[[1, 0, 700]]']])
        ->and(packTimingRows(packBuildGzip($untrusted)))->toBe([]);
});

it('never mixes the rows of two recitations', function (): void {
    $resource = packTimingResource(6);
    $recitation = Recitation::factory()->create(['resource_id' => $resource->id]);
    $file = packTimingFile($recitation, 1, 'https://audio.example.test/fixture/6/001.mp3');
    packOwnTiming($file, 1, 0, 700, [[1, 0, 700]]);

    $other = Recitation::factory()->create();
    packTaybahSet($other, 1, $file->audio_url);
    packTaybahRow($other, 1, 1, 0, 300, [[1, 0, 300]]);

    expect(packTimingRows(packBuildGzip($resource)))
        ->toBe([['audio_file_id' => (string) $file->id, 'verse_id' => '1', 'start_ms' => '0', 'end_ms' => '700', 'segments' => '[[1, 0, 700]]']]);
});

it('writes segments and null segments as in the QF path', function (): void {
    $resource = packTimingResource(5);
    config(['quran.untrusted_timing_recitations' => [5]]);
    $recitation = Recitation::factory()->create(['resource_id' => $resource->id]);
    $file = packTimingFile($recitation, 1, 'https://audio.example.test/fixture/5/001.mp3');
    packTaybahSet($recitation, 1, $file->audio_url);
    packTaybahRow($recitation, 1, 1, 0, 500, [[1, 0, 250], [2, 250, 500]]);
    packTaybahRow($recitation, 1, 2, 500, 900, null);

    $expected = DB::table('taybah_recitation_timings')->where('verse_id', 1)->value('segments');
    $rows = packTimingRows(packBuildGzip($resource));

    expect($expected)->toBeString()
        ->and($rows[0]['segments'])->toBe($expected)
        ->and($rows[1]['segments'])->toBeNull();
});

it('builds a new pack version through content:ensure-packs after a Taybah import bumps the resource', function (): void {
    $root = storage_path('framework/testing/pack-timings-'.bin2hex(random_bytes(4)));
    config(['quran.recitation_timings.path' => $root]);
    $recitation = packTimingsImportFixture($root);
    $resource = Resource::query()->findOrFail($recitation->resource_id);

    expect(Artisan::call('recitation-timings:import', ['--defer-pack' => true]))->toBe(0);

    $resource->refresh();
    $fileId = ChapterAudioFile::query()->where('recitation_id', $recitation->id)->where('chapter_id', 108)->value('id');

    expect(Artisan::call('content:ensure-packs'))->toBe(0)
        ->and(Artisan::output())->toContain('OK '.$resource->id.' v'.$resource->version);

    $pack = ContentPack::query()->where('resource_id', $resource->id)->where('version', $resource->version)->sole();
    $rows = packTimingRows(Storage::disk('local')->get($pack->path));

    expect(array_unique(array_column($rows, 'audio_file_id')))->toBe([(string) $fileId])
        ->and(count($rows))->toBe(3);

    File::deleteDirectory($root);
});

it('builds the pack of an imported MP3Quran recitation with the reserved file ids', function (): void {
    mp3QuranTestManifest([mp3QuranTestMoshaf(253, [1, 2])]);
    app(Mp3QuranImporter::class)->import(deferPack: true);

    $resource = Resource::query()
        ->where('group', ResourceGroup::ChapterRecitations)
        ->where('source_key', '253')
        ->sole();
    $ids = ChapterAudioFile::query()
        ->whereIn('recitation_id', Recitation::query()->where('resource_id', $resource->id)->select('id'))
        ->orderBy('id')
        ->pluck('id')
        ->all();

    expect($ids)->toBe([Mp3QuranFileId::for(253, 1), Mp3QuranFileId::for(253, 2)])
        ->and(packTimingRows(packBuildGzip($resource)))->toBe([]);

    $fileId = Mp3QuranFileId::for(253, 1);
    $url = ChapterAudioFile::query()->whereKey($fileId)->value('audio_url');
    $recitation = Recitation::query()->where('resource_id', $resource->id)->sole();
    packTaybahSet($recitation, 1, (string) $url);
    packTaybahRow($recitation, 1, 1, 0, 300, [[1, 0, 300]]);
    $resource->version = $resource->version + 1;
    $resource->save();

    expect(packTimingRows(packBuildGzip($resource)))
        ->toBe([['audio_file_id' => (string) $fileId, 'verse_id' => '1', 'start_ms' => '0', 'end_ms' => '300', 'segments' => '[[1, 0, 300]]']]);
});

/**
 * A chapter recitations resource with the given QF reciter id as its source key.
 */
function packTimingResource(int $sourceKey): Resource
{
    return Resource::factory()->create([
        'group' => ResourceGroup::ChapterRecitations,
        'source_key' => (string) $sourceKey,
        'version' => 1,
    ]);
}

function packTimingFile(Recitation $recitation, int $chapter, string $url): ChapterAudioFile
{
    return ChapterAudioFile::factory()->create([
        'recitation_id' => $recitation->id,
        'chapter_id' => $chapter,
        'audio_url' => $url,
    ]);
}

function packOwnTiming(ChapterAudioFile $file, int $verse, int $startMs, int $endMs, ?array $segments): void
{
    RecitationTiming::query()->create([
        'audio_file_id' => $file->id,
        'verse_id' => $verse,
        'verse_key' => '1:'.$verse,
        'start_ms' => $startMs,
        'end_ms' => $endMs,
        'segments' => $segments,
    ]);
}

function packTaybahSet(Recitation $recitation, int $chapter, string $url): void
{
    TaybahTimingSet::factory()->create([
        'recitation_id' => $recitation->id,
        'chapter_id' => $chapter,
        'audio_url' => $url,
    ]);
}

/**
 * @param  list<array{0: int, 1: int, 2: int}>|null  $segments
 */
function packTaybahRow(Recitation $recitation, int $chapter, int $verse, int $startMs, int $endMs, ?array $segments): void
{
    TaybahRecitationTiming::factory()->create([
        'recitation_id' => $recitation->id,
        'chapter_id' => $chapter,
        'verse_id' => $verse,
        'start_ms' => $startMs,
        'end_ms' => $endMs,
        'segments' => $segments,
    ]);
}

/**
 * Builds the resource's pack and returns its gzipped bytes.
 */
function packBuildGzip(Resource $resource): string
{
    $pack = app(PackBuilder::class)->build($resource);

    return (string) Storage::disk('local')->get($pack->path);
}

/**
 * The recitation_timings rows of a pack, as strings, in pack order.
 *
 * @return list<array<string, string|null>>
 */
function packTimingRows(string $gzipped): array
{
    $rows = [];

    withContentPack($gzipped, function (PDO $pdo) use (&$rows): void {
        foreach ($pdo->query('SELECT audio_file_id, verse_id, start_ms, end_ms, segments FROM recitation_timings ORDER BY audio_file_id, verse_id')->fetchAll() as $row) {
            $rows[] = array_map(fn (mixed $value): ?string => $value === null ? null : (string) $value, $row);
        }
    });

    return $rows;
}

/**
 * A mp3quran recitation with one chapter 108 file, two word layouts per ayah, and its committed Taybah file on disk.
 * Numbers and placeholder URLs only.
 */
function packTimingsImportFixture(string $root): Recitation
{
    $source = ContentSource::query()->firstOrCreate(['code' => 'mp3quran'], [
        'name' => 'MP3Quran',
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
    $url = 'https://audio.example.test/fixture/mp3quran/253/108.mp3';
    ChapterAudioFile::factory()->create([
        'recitation_id' => $recitation->id,
        'chapter_id' => 108,
        'audio_url' => $url,
        'size_bytes' => 1024,
    ]);

    if (! Mushaf::query()->whereKey(1)->exists()) {
        Mushaf::factory()->create(['id' => 1]);
    }

    foreach ([0, 1, 2] as $index) {
        foreach ([1, 2] as $position) {
            WordLayout::factory()->create([
                'mushaf_id' => 1,
                'verse_id' => ChapterVerseCounts::firstVerseId(108) + $index,
                'position_in_verse' => $position,
                'char_type' => 'word',
            ]);
        }
    }

    $ayahs = [];

    foreach ([0, 1, 2] as $index) {
        $start = $index * 1000;
        $ayahs[] = [
            'verse_key' => '108:'.($index + 1),
            'verse_id' => ChapterVerseCounts::firstVerseId(108) + $index,
            'start_ms' => $start,
            'end_ms' => $start + 1000,
            'segments' => [[1, $start, $start + 500], [2, $start + 500, $start + 1000]],
        ];
    }

    $folder = $root.'/mp3quran/253';
    File::ensureDirectoryExists($folder);
    file_put_contents($folder.'/108.json', json_encode([
        'format' => 1,
        'kind' => 'mp3quran',
        'recitation_key' => '253',
        'chapter_id' => 108,
        'audio' => ['url' => $url, 'bytes' => 1024, 'sha256' => str_repeat('a', 64), 'measured_duration_ms' => 3000],
        'source' => 'aligner',
        'tool_version' => '0.0.0-fixture',
        'models' => ['align' => ['id' => 'fixture-model', 'revision' => 'fixture'], 'asr' => null],
        'original_first_start_ms' => null,
        'ayahs' => $ayahs,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));

    return $recitation;
}
