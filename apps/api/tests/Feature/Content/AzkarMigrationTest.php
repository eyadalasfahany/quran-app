<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// No RefreshDatabase: the create migrations run DDL, which commits any open transaction on MySQL.
// Each test restores the schema it changes, so later tests see the fully migrated database.

beforeEach(function (): void {
    $this->artisan('migrate')->assertSuccessful();
});

/**
 * @return array<string, array{columns: list<string>, primary: list<string>, indexes: array<string, list<string>>, uniques: list<string>}>
 */
function azkarTableContract(): array
{
    return [
        'azkar_chapters' => [
            'columns' => ['resource_id', 'id', 'source_chapter_id', 'number', 'title_ar?', 'title_en?'],
            'primary' => ['resource_id', 'id'],
            'indexes' => [],
            'uniques' => [],
        ],
        'azkar_entries' => [
            'columns' => ['resource_id', 'id', 'entry_key', 'chapter_id', 'position', 'source_reference', 'entry_type', 'occasion?', 'timing_type?', 'timing_prayer?', 'timing_policy_id?', 'review_status', 'source_version', 'imported_at'],
            'primary' => ['resource_id', 'id'],
            'indexes' => ['azkar_entries_chapter_position_index' => ['resource_id', 'chapter_id', 'position']],
            'uniques' => ['azkar_entries_entry_key_unique'],
        ],
        'azkar_items' => [
            'columns' => ['resource_id', 'id', 'entry_id', 'item_key', 'variation_key', 'position', 'kind', 'required_count?', 'speaker?', 'source_dua_id?', 'text_en?', 'transliteration?', 'source_text_sha256?'],
            'primary' => ['resource_id', 'id'],
            'indexes' => ['azkar_items_entry_variation_position_index' => ['resource_id', 'entry_id', 'variation_key', 'position']],
            'uniques' => ['azkar_items_item_key_unique'],
        ],
        'azkar_segments' => [
            'columns' => ['resource_id', 'item_id', 'position', 'kind', 'text_ar?', 'quran_surah?', 'quran_verse_from?', 'quran_verse_to?', 'text_search?'],
            'primary' => ['resource_id', 'item_id', 'position'],
            'indexes' => [],
            'uniques' => [],
        ],
        'azkar_categories' => [
            'columns' => ['resource_id', 'id', 'kind', 'position', 'occasion?', 'progress_period'],
            'primary' => ['resource_id', 'id'],
            'indexes' => [],
            'uniques' => [],
        ],
        'azkar_entry_categories' => [
            'columns' => ['resource_id', 'category_id', 'entry_id', 'variation_key', 'position'],
            'primary' => ['resource_id', 'category_id', 'entry_id', 'variation_key'],
            'indexes' => [],
            'uniques' => [],
        ],
        'azkar_notes' => [
            'columns' => ['resource_id', 'id', 'entry_id', 'item_id?', 'kind', 'text_ar?', 'text_en?', 'grader?', 'source_type', 'source_name', 'source_reference?', 'source_url?', 'review_status'],
            'primary' => ['resource_id', 'id'],
            'indexes' => ['azkar_notes_entry_index' => ['resource_id', 'entry_id']],
            'uniques' => [],
        ],
        'azkar_recordings' => [
            'columns' => ['resource_id', 'id', 'recording_key', 'item_id', 'reciter_name', 'reciter_name_ar?', 'source', 'remote_url', 'duration_ms', 'size_bytes?', 'stream_allowed', 'download_allowed', 'redistribution_allowed', 'attribution_ar?', 'attribution_en?', 'licence', 'licence_url?', 'rights_verified_at?'],
            'primary' => ['resource_id', 'id'],
            'indexes' => ['azkar_recordings_item_index' => ['resource_id', 'item_id']],
            'uniques' => ['azkar_recordings_recording_key_unique'],
        ],
    ];
}

/**
 * @return list<string>
 */
function azkarCreateMigrationNames(): array
{
    return array_map(
        fn (string $table): string => 'create_'.$table.'_table',
        array_keys(azkarTableContract()),
    );
}

function azkarMigration(string $name): object
{
    $files = glob(database_path('migrations/*_'.$name.'.php')) ?: [];

    expect($files)->toHaveCount(1);

    return require $files[0];
}

/**
 * @return list<string>
 */
function azkarColumnsOf(string $table): array
{
    return collect(Schema::getColumns($table))
        ->map(fn (array $column): string => $column['name'].($column['nullable'] ? '?' : ''))
        ->values()
        ->all();
}

it('creates the eight azkar tables with the canonical columns, keys and indexes', function (): void {
    foreach (azkarCreateMigrationNames() as $name) {
        azkarMigration($name)->down();
    }

    foreach (azkarCreateMigrationNames() as $name) {
        azkarMigration($name)->up();
    }

    foreach (azkarTableContract() as $table => $contract) {
        expect(Schema::hasTable($table))->toBeTrue()
            ->and(azkarColumnsOf($table))->toBe($contract['columns']);

        $indexes = collect(Schema::getIndexes($table));

        expect($indexes->firstWhere('primary', true)['columns'] ?? [])->toBe($contract['primary']);

        foreach ($contract['indexes'] as $index => $columns) {
            expect($indexes->firstWhere('name', $index)['columns'] ?? null)->toBe($columns);
        }

        foreach ($contract['uniques'] as $unique) {
            expect($indexes->firstWhere('name', $unique)['unique'] ?? false)->toBeTrue();
        }

        $foreignKeys = collect(Schema::getForeignKeys($table));

        expect($foreignKeys->pluck('foreign_table')->all())->toBe(['resources'])
            ->and($foreignKeys->first()['on_delete'] ?? null)->toBe('cascade');
    }

    $mediumColumns = [
        'azkar_segments' => ['text_ar', 'text_search'],
        'azkar_items' => ['text_en', 'transliteration'],
        'azkar_notes' => ['text_ar', 'text_en'],
    ];

    foreach ($mediumColumns as $table => $columns) {
        $types = collect(Schema::getColumns($table))->pluck('type_name', 'name');

        foreach ($columns as $column) {
            expect($types[$column])->toBe('mediumtext');
        }
    }
});

it('drops every azkar table on down and restores it on up', function (): void {
    foreach (array_reverse(azkarCreateMigrationNames()) as $name) {
        azkarMigration($name)->down();
    }

    foreach (array_keys(azkarTableContract()) as $table) {
        expect(Schema::hasTable($table))->toBeFalse();
    }

    foreach (azkarCreateMigrationNames() as $name) {
        azkarMigration($name)->up();
    }

    foreach (array_keys(azkarTableContract()) as $table) {
        expect(Schema::hasTable($table))->toBeTrue();
    }
});

it('seeds the opendua source, grants it (ADR 0038), and its down removes only that row', function (): void {
    $migration = azkarMigration('insert_opendua_content_source');

    $migration->down();
    expect(DB::table('content_sources')->where('code', 'opendua')->exists())->toBeFalse();

    $migration->up();
    $migration->up();
    azkarMigration('grant_opendua_content_source')->up();

    $row = DB::table('content_sources')->where('code', 'opendua')->get();

    expect($row)->toHaveCount(1);

    $source = $row->first();

    expect($source->permission_status)->toBe('granted')
        ->and($source->licence_url)->toBe('https://opendua.org/developers')
        ->and($source->attribution_ar)->toBe('')
        ->and($source->notes)->toBe("Granted by ADR 0038 on OpenDua's public statements (1 Nov 2026). Arabic attribution not published by OpenDua. Audio not licensed.")
        ->and($source->attribution_en)->toBe("OpenDua dataset v0.0.4 (https://opendua.org), by Ihsan Labs at the Human Development Fund. Based on Hisn al-Muslim by Sa'id ibn Ali ibn Wahf al-Qahtani. OpenDua editorial text and dataset structure are licensed CC BY 4.0. Recitation by Muhammad Jumah for OpenDua. OpenDua makes no ownership claim over the underlying religious texts.");
});

it('grants the opendua source on its public statements (ADR 0038) and keeps its attribution', function (): void {
    $migration = azkarMigration('grant_opendua_content_source');

    $migration->down();
    $migration->up();

    $source = DB::table('content_sources')->where('code', 'opendua')->first();

    expect($source->permission_status)->toBe('granted')
        ->and($source->licence_url)->toBe('https://opendua.org/developers')
        ->and($source->notes)->toBe("Granted by ADR 0038 on OpenDua's public statements (1 Nov 2026). Arabic attribution not published by OpenDua. Audio not licensed.")
        ->and($source->attribution_ar)->toBe('')
        ->and($source->attribution_en)->toStartWith('OpenDua dataset v0.0.4 (https://opendua.org)');
});

it('the grant migration down restores the pending source, its old licence URL and its old notes', function (): void {
    $migration = azkarMigration('grant_opendua_content_source');

    $migration->up();
    $migration->down();

    $source = DB::table('content_sources')->where('code', 'opendua')->first();

    expect($source->permission_status)->toBe('pending')
        ->and($source->licence_url)->toBe('https://opendua.hdfund.org/developers#dev-licence')
        ->and($source->notes)->toBe("Arabic attribution pending OpenDua's wording");

    $migration->up();
});
