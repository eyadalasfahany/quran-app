<?php

declare(strict_types=1);

use App\Domains\Content\Data\ContentPackData;
use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Packs\PackBuilder;
use App\Domains\Content\Packs\PackColumn;
use App\Domains\Content\Packs\PackSchema;
use App\Domains\Hadith\Enums\HadithAliasMatch;
use Database\Factories\HadithBookFactory;
use Database\Factories\HadithChapterFactory;
use Database\Factories\HadithCollectionFactory;
use Database\Factories\HadithEntryFactory;
use Database\Factories\HadithGradeFactory;
use Database\Factories\HadithRefAliasFactory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Http::preventStrayRequests();
    Storage::fake('local');
    $this->withHeaders([
        'Accept' => 'application/json',
        'Accept-Language' => 'en',
    ]);
});

it('builds a pack with the six hadith tables for a hadith_collections resource', function (): void {
    $collection = HadithCollectionFactory::new()->state(['slug' => 'fixture-a'])->create();
    $resourceId = $collection->resource_id;
    HadithBookFactory::new()->create(['resource_id' => $resourceId, 'id' => 1]);
    HadithEntryFactory::new()->create(['resource_id' => $resourceId, 'id' => 1, 'book_id' => 1]);

    $pack = hadithPackBuild($resourceId);
    $pdo = hadithPackOpen(Storage::disk('local')->get($pack->path));

    $tables = $pdo->query("SELECT name FROM sqlite_master WHERE type = 'table'")->fetchAll(PDO::FETCH_COLUMN);
    expect($tables)->toContain('hadith_collections', 'hadith_books', 'hadith_chapters', 'hadith_entries', 'hadith_grades', 'hadith_ref_aliases');

    $meta = array_column($pdo->query('SELECT key, value FROM meta')->fetchAll(), 'value', 'key');
    expect($meta)->toMatchArray([
        'group' => 'hadith_collections',
        'pack_schema_version' => '1',
    ]);

    expect(count(hadithPackRows($pdo, 'hadith_collections')))->toBe(1)
        ->and(count(hadithPackRows($pdo, 'hadith_books')))->toBe(1)
        ->and(count(hadithPackRows($pdo, 'hadith_entries')))->toBe(1)
        ->and(count(hadithPackRows($pdo, 'hadith_chapters')))->toBe(0)
        ->and(count(hadithPackRows($pdo, 'hadith_grades')))->toBe(0)
        ->and(count(hadithPackRows($pdo, 'hadith_ref_aliases')))->toBe(0);
});

it('matches the MySQL columns minus the server-only columns, in order', function (): void {
    $collection = HadithCollectionFactory::new()->create();
    $resourceId = $collection->resource_id;
    HadithBookFactory::new()->create(['resource_id' => $resourceId]);
    HadithChapterFactory::new()->create(['resource_id' => $resourceId]);
    HadithEntryFactory::new()->create(['resource_id' => $resourceId]);
    HadithGradeFactory::new()->create(['resource_id' => $resourceId]);
    HadithRefAliasFactory::new()->create(['resource_id' => $resourceId]);

    $serverOnly = ['source_id', 'source_key', 'source_text_sha256', 'source_version', 'imported_at'];
    $pdo = hadithPackOpen(Storage::disk('local')->get(hadithPackBuild($resourceId)->path));

    foreach (PackSchema::tablesFor(ResourceGroup::HadithCollections) as $table) {
        $mysql = array_values(array_diff(Schema::getColumnListing($table->name), $serverOnly));
        $packed = array_map(fn (PackColumn $column): string => $column->name, $table->columns);

        expect($packed)->toBe($mysql, 'table: '.$table->name);

        $names = array_map(fn (array $row): string => (string) $row['name'], $pdo->query('PRAGMA table_info('.$table->name.')')->fetchAll());
        expect($names)->toBe($packed, 'sqlite table: '.$table->name);
    }
});

it('copies a collection row without server-only fields', function (): void {
    $collection = HadithCollectionFactory::new()->state(['slug' => 'fixture-a', 'total_hadith' => 7])->create();

    $pdo = hadithPackOpen(Storage::disk('local')->get(hadithPackBuild($collection->resource_id)->path));
    $row = hadithPackRows($pdo, 'hadith_collections')[0];

    expect($row)->not->toHaveKeys(['source_id', 'source_key', 'source_version', 'imported_at'])
        ->and($row['slug'])->toBe('fixture-a')
        ->and($row['source_code'])->toBe($collection->source_code)
        ->and((int) $row['total_hadith'])->toBe(7);
});

it('ships hadith text byte for byte, including a bidi mark and surrounding spaces', function (): void {
    $resourceId = HadithCollectionFactory::new()->create()->resource_id;
    $bidi = HadithEntryFactory::new()->withBidiMark()->create(['resource_id' => $resourceId, 'id' => 1, 'book_id' => 1]);
    $arabic = HadithEntryFactory::new()->arabic()->create(['resource_id' => $resourceId, 'id' => 2, 'book_id' => 1]);
    $spaced = HadithEntryFactory::new()->create([
        'resource_id' => $resourceId,
        'id' => 3,
        'book_id' => 1,
        'text_ar' => " FIXTURE text 1 — not a hadith \u{200F}  ",
    ]);

    $pdo = hadithPackOpen(Storage::disk('local')->get(hadithPackBuild($resourceId)->path));
    $rows = collect(hadithPackRows($pdo, 'hadith_entries'))->keyBy(fn (array $row): int => (int) $row['id']);

    foreach ([$bidi, $arabic, $spaced] as $entry) {
        $stored = DB::table('hadith_entries')->where('resource_id', $resourceId)->where('id', $entry->id)->value('text_ar');

        expect($stored)->toBeString()
            ->and(bin2hex((string) $rows[$entry->id]['text_ar']))->toBe(bin2hex((string) $stored))
            ->and($rows[$entry->id])->not->toHaveKey('source_text_sha256');
    }
});

it('keeps hadith numbers as text', function (): void {
    $resourceId = HadithCollectionFactory::new()->create()->resource_id;
    HadithEntryFactory::new()->decimalNumber()->create(['resource_id' => $resourceId, 'id' => 1, 'book_id' => 1]);

    $pdo = hadithPackOpen(Storage::disk('local')->get(hadithPackBuild($resourceId)->path));

    expect(hadithPackRows($pdo, 'hadith_entries')[0]['hadith_number'])->toBe('2787.2')
        ->and($pdo->query('SELECT typeof(hadith_number) FROM hadith_entries')->fetchColumn())->toBe('text');
});

it('ships a null chapter id and a chapter id', function (): void {
    $resourceId = HadithCollectionFactory::new()->create()->resource_id;
    HadithEntryFactory::new()->create(['resource_id' => $resourceId, 'id' => 1, 'book_id' => 1]);
    HadithEntryFactory::new()->inChapter(5)->create(['resource_id' => $resourceId, 'id' => 2, 'book_id' => 1]);

    $pdo = hadithPackOpen(Storage::disk('local')->get(hadithPackBuild($resourceId)->path));
    $chapters = array_column(hadithPackRows($pdo, 'hadith_entries'), 'chapter_id');

    expect($chapters)->toBe([null, 5]);
});

it('builds with empty chapters and empty aliases', function (): void {
    $resourceId = HadithCollectionFactory::new()->create()->resource_id;
    HadithBookFactory::new()->create(['resource_id' => $resourceId, 'id' => 1]);
    HadithEntryFactory::new()->create(['resource_id' => $resourceId, 'id' => 1, 'book_id' => 1]);

    $pack = hadithPackBuild($resourceId);

    expect($pack->rowCount)->toBe(3);
});

it('leaves hadith_grades empty while grades_visible is false', function (): void {
    expect(config('hadith.grades_visible'))->toBeFalse();

    $resourceId = HadithCollectionFactory::new()->create()->resource_id;
    HadithEntryFactory::new()->create(['resource_id' => $resourceId, 'id' => 1, 'book_id' => 1]);
    HadithGradeFactory::new()->create(['resource_id' => $resourceId, 'id' => 1, 'entry_id' => 1]);
    HadithGradeFactory::new()->create(['resource_id' => $resourceId, 'id' => 2, 'entry_id' => 1]);

    expect(DB::table('hadith_grades')->where('resource_id', $resourceId)->count())->toBe(2);

    $pdo = hadithPackOpen(Storage::disk('local')->get(hadithPackBuild($resourceId)->path));

    expect(hadithPackRows($pdo, 'hadith_grades'))->toBe([]);
});

it('ships only graded rows when grades_visible is true', function (): void {
    config(['hadith.grades_visible' => true]);

    $resourceId = HadithCollectionFactory::new()->create()->resource_id;
    HadithEntryFactory::new()->create(['resource_id' => $resourceId, 'id' => 1, 'book_id' => 1]);
    HadithGradeFactory::new()->create(['resource_id' => $resourceId, 'id' => 1, 'entry_id' => 1]);
    HadithGradeFactory::new()->ungraded()->create(['resource_id' => $resourceId, 'id' => 2, 'entry_id' => 1]);

    $pdo = hadithPackOpen(Storage::disk('local')->get(hadithPackBuild($resourceId)->path));
    $grades = hadithPackRows($pdo, 'hadith_grades');

    expect($grades)->toHaveCount(1)
        ->and($grades[0]['graded_by'])->toBe('FIXTURE grader');
});

it('round trips an alias row whose column is named match', function (): void {
    $resourceId = HadithCollectionFactory::new()->create()->resource_id;
    HadithRefAliasFactory::new()->ofMatch(HadithAliasMatch::SimilarText)->create(['resource_id' => $resourceId, 'old_number' => '1', 'new_number' => '2']);
    HadithRefAliasFactory::new()->withoutNewNumber()->create(['resource_id' => $resourceId, 'old_number' => '3']);

    $pdo = hadithPackOpen(Storage::disk('local')->get(hadithPackBuild($resourceId)->path));
    $rows = $pdo->query('SELECT match, new_number, old_number FROM hadith_ref_aliases ORDER BY old_number')->fetchAll();

    expect(array_column($rows, 'match'))->toBe([HadithAliasMatch::SimilarText->value, HadithAliasMatch::None->value])
        ->and($rows[0]['new_number'])->toBe('2')
        ->and($rows[1]['new_number'])->toBeNull();
});

it('packs only the rows of its own resource', function (): void {
    $first = HadithCollectionFactory::new()->state(['slug' => 'fixture-a'])->create();
    $second = HadithCollectionFactory::new()->state(['slug' => 'fixture-b'])->create();

    foreach ([$first, $second] as $collection) {
        HadithBookFactory::new()->create(['resource_id' => $collection->resource_id, 'id' => 1]);
        HadithEntryFactory::new()->create(['resource_id' => $collection->resource_id, 'id' => 1, 'book_id' => 1]);
    }

    $pdo = hadithPackOpen(Storage::disk('local')->get(hadithPackBuild($first->resource_id)->path));
    $collections = hadithPackRows($pdo, 'hadith_collections');
    $entries = hadithPackRows($pdo, 'hadith_entries');

    expect($collections)->toHaveCount(1)
        ->and($collections[0]['slug'])->toBe('fixture-a')
        ->and(array_unique(array_column($entries, 'resource_id')))->toBe([$first->resource_id]);
});

it('lists a built hadith pack in the manifest', function (): void {
    $collection = HadithCollectionFactory::new()->create();
    HadithEntryFactory::new()->create(['resource_id' => $collection->resource_id, 'id' => 1, 'book_id' => 1]);
    $pack = hadithPackBuild($collection->resource_id);

    $response = $this->getJson('/api/v1/content/manifest');

    $response->assertOk()
        ->assertJsonCount(1, 'resources')
        ->assertJsonPath('resources.0.id', $collection->resource_id)
        ->assertJsonPath('resources.0.group', 'hadith_collections')
        ->assertJsonPath('resources.0.version', $pack->version)
        ->assertJsonPath('resources.0.pack.size_bytes', $pack->sizeBytes);

    expect($pack->sizeBytes)->toBeGreaterThan(0);
});

it('lists one resource per collection for the ten canonical slugs', function (): void {
    $slugs = config('hadith.collections');
    expect($slugs)->toHaveCount(10);

    foreach ($slugs as $slug) {
        $collection = HadithCollectionFactory::new()->state(['slug' => $slug])->create();
        HadithBookFactory::new()->create(['resource_id' => $collection->resource_id, 'id' => 1]);
        HadithEntryFactory::new()->create(['resource_id' => $collection->resource_id, 'id' => 1, 'book_id' => 1]);
        hadithPackBuild($collection->resource_id);
    }

    $resources = $this->getJson('/api/v1/content/manifest')
        ->assertOk()
        ->assertJsonCount(10, 'resources')
        ->json('resources');

    expect(collect($resources)->pluck('group')->unique()->all())->toBe(['hadith_collections']);
});

it('does not list a hadith resource that has no pack', function (): void {
    HadithCollectionFactory::new()->create();

    $this->getJson('/api/v1/content/manifest')
        ->assertOk()
        ->assertJsonCount(0, 'resources');
});

it('serves the built pack file', function (): void {
    $collection = HadithCollectionFactory::new()->create();
    HadithEntryFactory::new()->create(['resource_id' => $collection->resource_id, 'id' => 1, 'book_id' => 1]);
    $pack = hadithPackBuild($collection->resource_id);
    $bytes = Storage::disk('local')->get($pack->path);

    $this->get('/api/v1/content/packs/'.$collection->resource_id.'/'.$pack->version)
        ->assertOk()
        ->assertHeader('Content-Length', (string) strlen((string) $bytes));
});

function hadithPackBuild(int $resourceId): ContentPackData
{
    return app(PackBuilder::class)->build(Resource::query()->findOrFail($resourceId));
}

function hadithPackOpen(?string $gzipped): PDO
{
    expect($gzipped)->toBeString();

    $raw = gzdecode((string) $gzipped);
    expect($raw)->toBeString();

    $path = tempnam(sys_get_temp_dir(), 'hadith-pack-');
    expect($path)->toBeString();

    file_put_contents((string) $path, (string) $raw);

    return new PDO('sqlite:'.$path, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
}

/**
 * @return list<array<string, mixed>>
 */
function hadithPackRows(PDO $pdo, string $table): array
{
    /** @var list<array<string, mixed>> $rows */
    $rows = $pdo->query('SELECT * FROM '.$table.' ORDER BY rowid')->fetchAll();

    return $rows;
}
