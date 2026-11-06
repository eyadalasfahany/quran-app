<?php

declare(strict_types=1);

use App\Domains\Hadith\Enums\HadithAliasMatch;
use App\Domains\Hadith\Models\HadithBook;
use App\Domains\Hadith\Models\HadithChapter;
use App\Domains\Hadith\Models\HadithCollection;
use App\Domains\Hadith\Models\HadithEntry;
use App\Domains\Hadith\Models\HadithGrade;
use App\Domains\Hadith\Models\HadithRefAlias;
use Database\Factories\HadithEntryFactory;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

/**
 * @return array<string, array{columns: list<string>, primary: list<string>, indexes: array<string, list<string>>, uniques: list<string>}>
 */
function hadithSchemaContract(): array
{
    return [
        'hadith_collections' => [
            'columns' => ['resource_id', 'id', 'slug', 'source_id', 'source_code', 'title_ar?', 'title_en?', 'author_ar?', 'author_en?', 'attribution_ar', 'attribution_en', 'source_url?', 'total_hadith', 'books_count', 'source_version', 'imported_at'],
            'primary' => ['resource_id', 'id'],
            'indexes' => [],
            'uniques' => ['hadith_collections_slug_unique'],
        ],
        'hadith_books' => [
            'columns' => ['resource_id', 'id', 'book_number', 'title_ar?', 'title_en?', 'position', 'hadith_count', 'source_id', 'source_key'],
            'primary' => ['resource_id', 'id'],
            'indexes' => ['hadith_books_position_index' => ['resource_id', 'position']],
            'uniques' => ['hadith_books_source_key_unique'],
        ],
        'hadith_chapters' => [
            'columns' => ['resource_id', 'id', 'book_id', 'chapter_number', 'source_chapter_key?', 'title_ar?', 'title_en?', 'position', 'hadith_count', 'source_id', 'source_key'],
            'primary' => ['resource_id', 'id'],
            'indexes' => ['hadith_chapters_book_position_index' => ['resource_id', 'book_id', 'position']],
            'uniques' => ['hadith_chapters_source_key_unique'],
        ],
        'hadith_entries' => [
            'columns' => ['resource_id', 'id', 'book_id', 'chapter_id?', 'hadith_number', 'arabic_number?', 'position', 'text_ar', 'text_en?', 'narrator_en?', 'text_search', 'source_url?', 'source_id', 'source_key', 'source_text_sha256', 'source_version', 'imported_at'],
            'primary' => ['resource_id', 'id'],
            'indexes' => [
                'hadith_entries_number_index' => ['resource_id', 'hadith_number'],
                'hadith_entries_book_position_index' => ['resource_id', 'book_id', 'chapter_id', 'position'],
            ],
            'uniques' => ['hadith_entries_source_key_unique'],
        ],
        'hadith_grades' => [
            'columns' => ['resource_id', 'id', 'entry_id', 'grade', 'graded_by?', 'source_id', 'source_key'],
            'primary' => ['resource_id', 'id'],
            'indexes' => ['hadith_grades_entry_index' => ['resource_id', 'entry_id']],
            'uniques' => [],
        ],
        'hadith_ref_aliases' => [
            'columns' => ['resource_id', 'old_number', 'new_number?', 'match', 'since_version'],
            'primary' => ['resource_id', 'old_number', 'since_version'],
            'indexes' => [],
            'uniques' => [],
        ],
    ];
}

/**
 * @return list<string>
 */
function hadithSchemaCreateNames(): array
{
    return array_map(
        fn (string $table): string => 'create_'.$table.'_table',
        array_keys(hadithSchemaContract()),
    );
}

function hadithSchemaMigration(string $name): object
{
    $files = glob(database_path('migrations/*_'.$name.'.php')) ?: [];

    expect($files)->toHaveCount(1);

    return require $files[0];
}

/**
 * @return list<string>
 */
function hadithSchemaColumnsOf(string $table): array
{
    return collect(Schema::getColumns($table))
        ->map(fn (array $column): string => $column['name'].($column['nullable'] ? '?' : ''))
        ->values()
        ->all();
}

it('creates the six hadith tables with the canonical columns, keys and indexes', function (): void {
    foreach (array_reverse(hadithSchemaCreateNames()) as $name) {
        hadithSchemaMigration($name)->down();
    }

    foreach (hadithSchemaCreateNames() as $name) {
        hadithSchemaMigration($name)->up();
    }

    foreach (hadithSchemaContract() as $table => $contract) {
        expect(Schema::hasTable($table))->toBeTrue()
            ->and(hadithSchemaColumnsOf($table))->toBe($contract['columns']);

        $indexes = collect(Schema::getIndexes($table));

        expect($indexes->firstWhere('primary', true)['columns'] ?? [])->toBe($contract['primary']);

        foreach ($contract['indexes'] as $index => $columns) {
            expect($indexes->firstWhere('name', $index)['columns'] ?? null)->toBe($columns);
        }

        foreach ($contract['uniques'] as $unique) {
            expect($indexes->firstWhere('name', $unique)['unique'] ?? false)->toBeTrue();
        }

        $foreignKeys = collect(Schema::getForeignKeys($table));

        expect($foreignKeys->firstWhere('foreign_table', 'resources')['on_delete'] ?? null)->toBe('cascade');

        if ($table === 'hadith_ref_aliases') {
            expect($foreignKeys->pluck('foreign_table')->all())->not->toContain('content_sources');

            continue;
        }

        expect($foreignKeys->firstWhere('foreign_table', 'content_sources')['on_delete'] ?? null)->toBe('restrict');
    }
});

it('drops every hadith table on down and restores it on up', function (): void {
    foreach (array_reverse(hadithSchemaCreateNames()) as $name) {
        hadithSchemaMigration($name)->down();
    }

    foreach (array_keys(hadithSchemaContract()) as $table) {
        expect(Schema::hasTable($table))->toBeFalse();
    }

    foreach (hadithSchemaCreateNames() as $name) {
        hadithSchemaMigration($name)->up();
    }

    foreach (array_keys(hadithSchemaContract()) as $table) {
        expect(Schema::hasTable($table))->toBeTrue();
    }
});

it('stores the Arabic columns in the binary collation and every other hadith column in ai_ci', function (): void {
    /** @var list<object{TABLE_NAME: string, COLUMN_NAME: string, COLLATION_NAME: string}> $rows */
    $rows = DB::select(
        'select TABLE_NAME, COLUMN_NAME, COLLATION_NAME from information_schema.COLUMNS
            where TABLE_SCHEMA = database()
              and TABLE_NAME like ?
              and COLLATION_NAME is not null',
        ['hadith\_%'],
    );

    $binary = collect($rows)
        ->filter(fn (object $column): bool => $column->COLLATION_NAME === 'utf8mb4_0900_bin')
        ->map(fn (object $column): string => $column->TABLE_NAME.'.'.$column->COLUMN_NAME)
        ->sort()
        ->values()
        ->all();

    expect($binary)->toBe([
        'hadith_books.title_ar',
        'hadith_chapters.title_ar',
        'hadith_collections.attribution_ar',
        'hadith_collections.author_ar',
        'hadith_collections.title_ar',
        'hadith_entries.text_ar',
    ]);

    $others = collect($rows)
        ->reject(fn (object $column): bool => $column->COLLATION_NAME === 'utf8mb4_0900_bin');

    expect($others)->not->toBeEmpty()
        ->and($others->every(fn (object $column): bool => $column->COLLATION_NAME === 'utf8mb4_0900_ai_ci'))->toBeTrue();
});

it('keeps hadith numbers as text and round-trips a decimal number', function (): void {
    $entry = HadithEntry::factory()->decimalNumber()->create();

    $stored = DB::table('hadith_entries')
        ->where('resource_id', $entry->resource_id)
        ->where('id', $entry->id)
        ->value('hadith_number');

    expect($stored)->toBe('2787.2')
        ->and(collect(Schema::getColumns('hadith_entries'))->firstWhere('name', 'hadith_number')['type'] ?? null)->toBe('varchar(32)');
});

it('round-trips Arabic text byte for byte including a bidi mark and surrounding spaces', function (): void {
    $latin = " FIXTURE text 1 — not a hadith \u{200F}  ";
    $arabic = "نص تجريبي \u{0651}\u{064E} ١ — ليس حديثًا";

    $entry = HadithEntry::factory()->create(['text_ar' => $latin]);
    $secondEntry = HadithEntry::factory()->create(['text_ar' => $arabic]);
    $collection = HadithCollection::factory()->create(['title_ar' => $arabic]);
    $book = HadithBook::factory()->create(['title_ar' => $arabic]);

    $storedEntry = DB::table('hadith_entries')->where('resource_id', $entry->resource_id)->where('id', $entry->id)->value('text_ar');
    $storedSecondEntry = DB::table('hadith_entries')->where('resource_id', $secondEntry->resource_id)->where('id', $secondEntry->id)->value('text_ar');
    $storedCollection = DB::table('hadith_collections')->where('resource_id', $collection->resource_id)->where('id', $collection->id)->value('title_ar');
    $storedBook = DB::table('hadith_books')->where('resource_id', $book->resource_id)->where('id', $book->id)->value('title_ar');

    expect(bin2hex((string) $storedEntry))->toBe(bin2hex($latin))
        ->and(bin2hex((string) $storedSecondEntry))->toBe(bin2hex($arabic))
        ->and(bin2hex((string) $storedCollection))->toBe(bin2hex($arabic))
        ->and(bin2hex((string) $storedBook))->toBe(bin2hex($arabic));
});

it('treats two Arabic strings that differ only by a diacritic as different values', function (): void {
    $first = HadithEntryFactory::ARABIC_TEXT;
    $second = str_replace("\u{0646}", "\u{0646}\u{064E}", $first);

    $entry = HadithEntry::factory()->create(['text_ar' => $first]);
    HadithEntry::factory()->create(['text_ar' => $second]);

    $matches = DB::table('hadith_entries')->where('text_ar', $first)->pluck('id')->all();

    expect($matches)->toBe([$entry->id]);
});

it('rejects a duplicate (source_id, source_key) in books, chapters and entries', function (): void {
    HadithBook::factory()->create(['source_key' => 'fixture:dup:book']);
    HadithChapter::factory()->create(['source_key' => 'fixture:dup:chapter']);
    HadithEntry::factory()->create(['source_key' => 'fixture:dup:entry']);

    expect(fn () => HadithBook::factory()->create(['source_key' => 'fixture:dup:book']))
        ->toThrow(QueryException::class);

    expect(fn () => HadithChapter::factory()->create(['source_key' => 'fixture:dup:chapter']))
        ->toThrow(QueryException::class);

    expect(fn () => HadithEntry::factory()->create(['source_key' => 'fixture:dup:entry']))
        ->toThrow(QueryException::class);
});

it('allows the same source_key under a different source', function (): void {
    $entry = HadithEntry::factory()->create(['source_key' => 'fixture:shared:key']);

    $otherSourceId = DB::table('content_sources')->insertGetId([
        'code' => 'FIXTURE',
        'name' => 'FIXTURE other source',
        'licence_url' => 'https://example.com/licence',
        'attribution_ar' => 'FIXTURE',
        'attribution_en' => 'FIXTURE',
        'permission_status' => 'not_required',
        'notes' => 'FIXTURE',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    HadithEntry::factory()->create([
        'source_id' => $otherSourceId,
        'source_key' => $entry->source_key,
    ]);

    expect(DB::table('hadith_entries')->where('source_key', 'fixture:shared:key')->count())->toBe(2);
});

it('does not make (resource_id, hadith_number) unique', function (): void {
    HadithEntry::factory()->create(['hadith_number' => '7']);
    HadithEntry::factory()->create(['hadith_number' => '7']);

    $index = collect(Schema::getIndexes('hadith_entries'))->firstWhere('name', 'hadith_entries_number_index');

    expect(DB::table('hadith_entries')->where('hadith_number', '7')->count())->toBe(2)
        ->and($index['unique'] ?? null)->toBeFalse();
});

it('allows a null chapter_id and a chapter id', function (): void {
    $withoutChapter = HadithEntry::factory()->create();
    $withChapter = HadithEntry::factory()->inChapter(5)->create();

    expect(DB::table('hadith_entries')->where('id', $withoutChapter->id)->value('chapter_id'))->toBeNull()
        ->and(DB::table('hadith_entries')->where('id', $withChapter->id)->value('chapter_id'))->toBe(5);
});

it('rejects a duplicate collection slug', function (): void {
    HadithCollection::factory()->create(['slug' => 'fixture-dup-slug']);

    expect(fn () => HadithCollection::factory()->create(['slug' => 'fixture-dup-slug']))
        ->toThrow(QueryException::class);
});

it('keeps the resource primary key composite', function (): void {
    $first = HadithCollection::factory()->create(['id' => 1, 'slug' => 'fixture-pk-a']);
    HadithCollection::factory()->create(['id' => 1, 'slug' => 'fixture-pk-b']);

    expect(fn () => HadithCollection::factory()->create([
        'id' => 1,
        'slug' => 'fixture-pk-c',
        'resource_id' => $first->resource_id,
    ]))->toThrow(QueryException::class);
});

it('removes every hadith row when its resource is deleted', function (): void {
    $collection = HadithCollection::factory()->create();
    $resourceId = $collection->resource_id;

    HadithBook::factory()->create(['resource_id' => $resourceId]);
    HadithChapter::factory()->create(['resource_id' => $resourceId]);
    $entry = HadithEntry::factory()->create(['resource_id' => $resourceId]);
    HadithGrade::factory()->create(['resource_id' => $resourceId, 'entry_id' => $entry->id]);
    HadithRefAlias::factory()->create(['resource_id' => $resourceId]);

    DB::table('resources')->where('id', $resourceId)->delete();

    foreach (array_keys(hadithSchemaContract()) as $table) {
        expect(DB::table($table)->where('resource_id', $resourceId)->count())->toBe(0);
    }
});

it('refuses to delete a content source that hadith rows use', function (): void {
    $otherSourceId = DB::table('content_sources')->insertGetId([
        'code' => 'FIXTURE-RESTRICT',
        'name' => 'FIXTURE restrict resource source',
        'licence_url' => 'https://example.com/licence',
        'attribution_ar' => 'FIXTURE',
        'attribution_en' => 'FIXTURE',
        'permission_status' => 'not_required',
        'notes' => 'FIXTURE',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    // The resource sits under another source, so only the hadith row's restrict foreign key can block the delete.
    $resourceId = DB::table('resources')->insertGetId([
        'source_id' => $otherSourceId,
        'group' => 'hadith_collections',
        'source_key' => 'fixture-restrict',
        'name' => 'FIXTURE restrict resource',
        'language_code' => 'ar',
        'direction' => 'rtl',
        'version' => 1,
        'is_active' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    HadithEntry::factory()->create(['resource_id' => $resourceId]);

    $fawazahmed0Id = DB::table('content_sources')->where('code', 'fawazahmed0')->value('id');

    expect(fn () => DB::table('content_sources')->where('id', $fawazahmed0Id)->delete())
        ->toThrow(QueryException::class);
});

it('stores a grade without a grader', function (): void {
    $grade = HadithGrade::factory()->ungraded()->create();

    expect(DB::table('hadith_grades')->where('resource_id', $grade->resource_id)->where('id', $grade->id)->value('graded_by'))->toBeNull();
});

it('stores the alias match as a string value', function (): void {
    $alias = HadithRefAlias::factory()->ofMatch(HadithAliasMatch::SimilarText)->create();

    expect(DB::table('hadith_ref_aliases')
        ->where('resource_id', $alias->resource_id)
        ->where('old_number', $alias->old_number)
        ->value('match'))->toBe('similar_text');
});
