<?php

declare(strict_types=1);

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Events\ResourceContentChanged;
use App\Domains\Content\Jobs\BuildContentPackJob;
use App\Domains\Content\Models\ChapterAudioFile;
use App\Domains\Content\Models\ContentPack;
use App\Domains\Content\Models\Mushaf;
use App\Domains\Content\Models\MushafPage;
use App\Domains\Content\Models\Recitation;
use App\Domains\Content\Models\RecitationTiming;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Models\TafsirEntry;
use App\Domains\Content\Models\WordLayout;
use App\Domains\Content\Packs\PackBuilder;
use App\Domains\Content\Packs\PackBuildException;
use Illuminate\Filesystem\Filesystem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
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
