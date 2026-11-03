<?php

declare(strict_types=1);

use App\Domains\Duas\Models\DuaCollectionBook;
use App\Domains\Duas\Models\DuaCollectionRef;
use App\Domains\Duas\Models\DuaGroup;
use App\Domains\Duas\Models\DuaHadith;
use App\Domains\Duas\Models\DuaItem;
use App\Domains\Duas\Models\DuaLink;
use App\Domains\Duas\Models\DuaQuranSpan;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

/**
 * @return array<string, array{columns: list<string>, primary: list<string>, indexes: array<string, list<string>>, uniques: list<string>}>
 */
function duasTableContract(): array
{
    return [
        'dua_groups' => [
            'columns' => ['resource_id', 'id', 'source_category_id', 'title', 'position'],
            'primary' => ['resource_id', 'id'],
            'indexes' => ['dua_groups_position_index' => ['resource_id', 'position']],
            'uniques' => [],
        ],
        'dua_items' => [
            'columns' => ['resource_id', 'id', 'dua_key', 'kind', 'group_id?', 'position', 'source_id?', 'source_key?'],
            'primary' => ['resource_id', 'id'],
            'indexes' => [
                'dua_items_kind_position_index' => ['resource_id', 'kind', 'position'],
                'dua_items_group_position_index' => ['resource_id', 'group_id', 'position'],
            ],
            'uniques' => ['dua_items_dua_key_unique'],
        ],
        'dua_quran_spans' => [
            'columns' => ['resource_id', 'item_id', 'surah', 'verse_from', 'verse_to?', 'review_status', 'rule?'],
            'primary' => ['resource_id', 'item_id'],
            'indexes' => ['dua_quran_spans_surah_index' => ['resource_id', 'surah', 'verse_from']],
            'uniques' => [],
        ],
        'dua_hadith' => [
            'columns' => ['resource_id', 'item_id', 'hadeeth_id', 'title', 'hadeeth', 'attribution', 'grade?', 'explanation?', 'reference?', 'hints?', 'text_search', 'source_url', 'source_id', 'source_key', 'source_text_sha256', 'source_version', 'imported_at'],
            'primary' => ['resource_id', 'item_id'],
            'indexes' => ['dua_hadith_hadeeth_index' => ['resource_id', 'hadeeth_id']],
            'uniques' => ['dua_hadith_source_key_unique'],
        ],
        'dua_links' => [
            'columns' => ['resource_id', 'id', 'item_id', 'hadeeth_id', 'entry_key', 'review_status', 'evidence?'],
            'primary' => ['resource_id', 'id'],
            'indexes' => ['dua_links_item_index' => ['resource_id', 'item_id']],
            'uniques' => [],
        ],
        'dua_collection_refs' => [
            'columns' => ['resource_id', 'id', 'item_id', 'collection_slug', 'hadith_number', 'review_status', 'evidence?'],
            'primary' => ['resource_id', 'id'],
            'indexes' => ['dua_collection_refs_item_index' => ['resource_id', 'item_id']],
            'uniques' => [],
        ],
        'dua_collection_books' => [
            'columns' => ['resource_id', 'id', 'collection_slug', 'book_number', 'position'],
            'primary' => ['resource_id', 'id'],
            'indexes' => ['dua_collection_books_position_index' => ['resource_id', 'position']],
            'uniques' => ['dua_collection_books_slug_book_unique'],
        ],
    ];
}

/**
 * @return list<string>
 */
function duasCreateMigrationNames(): array
{
    return array_map(
        fn (string $table): string => 'create_'.$table.'_table',
        array_keys(duasTableContract()),
    );
}

function duasMigration(string $name): object
{
    $files = glob(database_path('migrations/*_'.$name.'.php')) ?: [];

    expect($files)->toHaveCount(1);

    return require $files[0];
}

/**
 * @return list<string>
 */
function duasColumnsOf(string $table): array
{
    return collect(Schema::getColumns($table))
        ->map(fn (array $column): string => $column['name'].($column['nullable'] ? '?' : ''))
        ->values()
        ->all();
}

it('creates the seven duas tables with the canonical columns, keys and indexes', function (): void {
    foreach (array_reverse(duasCreateMigrationNames()) as $name) {
        duasMigration($name)->down();
    }

    foreach (duasCreateMigrationNames() as $name) {
        duasMigration($name)->up();
    }

    foreach (duasTableContract() as $table => $contract) {
        expect(Schema::hasTable($table))->toBeTrue()
            ->and(duasColumnsOf($table))->toBe($contract['columns']);

        $indexes = collect(Schema::getIndexes($table));

        expect($indexes->firstWhere('primary', true)['columns'] ?? [])->toBe($contract['primary']);

        foreach ($contract['indexes'] as $index => $columns) {
            expect($indexes->firstWhere('name', $index)['columns'] ?? null)->toBe($columns);
        }

        foreach ($contract['uniques'] as $unique) {
            expect($indexes->firstWhere('name', $unique)['unique'] ?? false)->toBeTrue();
        }

        $foreignKeys = collect(Schema::getForeignKeys($table));

        expect($foreignKeys->pluck('foreign_table')->all())->toContain('resources')
            ->and($foreignKeys->firstWhere('foreign_table', 'resources')['on_delete'] ?? null)->toBe('cascade');
    }
});

it('drops every duas table on down and restores it on up', function (): void {
    foreach (array_reverse(duasCreateMigrationNames()) as $name) {
        duasMigration($name)->down();
    }

    foreach (array_keys(duasTableContract()) as $table) {
        expect(Schema::hasTable($table))->toBeFalse();
    }

    foreach (duasCreateMigrationNames() as $name) {
        duasMigration($name)->up();
    }

    foreach (array_keys(duasTableContract()) as $table) {
        expect(Schema::hasTable($table))->toBeTrue();
    }
});

it('stores hadith Arabic in the binary collation and round-trips a bidi mark byte for byte', function (): void {
    $sample = "FIXTURE text 1 — not a dua \u{200F}";

    $hadith = DuaHadith::factory()->create([
        'hadeeth' => $sample,
        'title' => $sample,
        'attribution' => $sample,
    ]);

    $stored = DuaHadith::query()
        ->where('resource_id', $hadith->resource_id)
        ->where('item_id', $hadith->item_id)
        ->first();

    expect(bin2hex((string) $stored?->hadeeth))->toBe(bin2hex($sample))
        ->and(bin2hex((string) $stored?->title))->toBe(bin2hex($sample));
});

it('rejects a duplicate dua_key', function (): void {
    DuaItem::factory()->create(['dua_key' => 'hadith:fixture-dup']);

    expect(fn () => DuaItem::factory()->create(['dua_key' => 'hadith:fixture-dup']))
        ->toThrow(QueryException::class);
});

it('creates valid rows from every duas factory', function (): void {
    expect(DuaGroup::factory()->create())->toBeInstanceOf(DuaGroup::class)
        ->and(DuaItem::factory()->create())->toBeInstanceOf(DuaItem::class)
        ->and(DuaQuranSpan::factory()->create())->toBeInstanceOf(DuaQuranSpan::class)
        ->and(DuaHadith::factory()->create())->toBeInstanceOf(DuaHadith::class)
        ->and(DuaLink::factory()->create())->toBeInstanceOf(DuaLink::class)
        ->and(DuaCollectionRef::factory()->create())->toBeInstanceOf(DuaCollectionRef::class)
        ->and(DuaCollectionBook::factory()->create())->toBeInstanceOf(DuaCollectionBook::class);
});

it('does not name any dua table column text_uthmani, verse_text or text_ar outside dua_hadith', function (): void {
    /** @var list<object{TABLE_NAME: string, COLUMN_NAME: string}> $rows */
    $rows = DB::select(
        'select TABLE_NAME, COLUMN_NAME from information_schema.COLUMNS
            where TABLE_SCHEMA = database()
              and TABLE_NAME like ?
              and COLUMN_NAME in (?, ?, ?)',
        ['dua_%', 'text_uthmani', 'verse_text', 'text_ar'],
    );

    expect($rows)->toBe([]);
});
