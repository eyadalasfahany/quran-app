<?php

declare(strict_types=1);

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Packs\PackSchema;
use App\Domains\Content\Packs\PackTable;

it('declares the eight azkar tables in contract order', function (): void {
    $tables = PackSchema::tablesFor(ResourceGroup::Azkar);

    expect(array_map(fn (PackTable $table): string => $table->name, $tables))->toBe([
        'azkar_chapters',
        'azkar_entries',
        'azkar_items',
        'azkar_segments',
        'azkar_categories',
        'azkar_entry_categories',
        'azkar_notes',
        'azkar_recordings',
    ]);
});

it('keys every azkar table by resource_id first and orders it by primary key', function (PackTable $table): void {
    expect($table->columns[0]->name)->toBe('resource_id')
        ->and($table->primaryKey[0])->toBe('resource_id')
        ->and($table->orderBy)->toBe($table->primaryKey);
})->with(fn (): array => array_map(
    fn (PackTable $table): array => [$table],
    PackSchema::tablesFor(ResourceGroup::Azkar),
));

it('gives every azkar table the columns of the canonical contract in order', function (string $name, array $columns): void {
    $table = collect(PackSchema::tablesFor(ResourceGroup::Azkar))->firstWhere('name', $name);

    expect($table)->toBeInstanceOf(PackTable::class)
        ->and(array_map(fn ($column): string => $column->name, $table->columns))->toBe($columns);
})->with([
    'chapters' => ['azkar_chapters', ['resource_id', 'id', 'source_chapter_id', 'number', 'title_ar', 'title_en']],
    'entries' => ['azkar_entries', ['resource_id', 'id', 'entry_key', 'chapter_id', 'position', 'source_reference', 'entry_type', 'occasion', 'timing_type', 'timing_prayer', 'timing_policy_id', 'review_status', 'source_version', 'imported_at']],
    'items' => ['azkar_items', ['resource_id', 'id', 'entry_id', 'item_key', 'variation_key', 'position', 'kind', 'required_count', 'speaker', 'source_dua_id', 'text_en', 'transliteration', 'source_text_sha256', 'repeat_group', 'repeat_times']],
    'segments' => ['azkar_segments', ['resource_id', 'item_id', 'position', 'kind', 'text_ar', 'quran_surah', 'quran_verse_from', 'quran_verse_to', 'text_search']],
    'categories' => ['azkar_categories', ['resource_id', 'id', 'kind', 'position', 'occasion', 'progress_period']],
    'entry categories' => ['azkar_entry_categories', ['resource_id', 'category_id', 'entry_id', 'variation_key', 'position']],
    'notes' => ['azkar_notes', ['resource_id', 'id', 'entry_id', 'item_id', 'kind', 'text_ar', 'text_en', 'grader', 'source_type', 'source_name', 'source_reference', 'source_url', 'review_status']],
    'recordings' => ['azkar_recordings', ['resource_id', 'id', 'recording_key', 'item_id', 'reciter_name', 'reciter_name_ar', 'source', 'remote_url', 'duration_ms', 'size_bytes', 'stream_allowed', 'download_allowed', 'redistribution_allowed', 'attribution_ar', 'attribution_en', 'licence', 'licence_url', 'rights_verified_at']],
]);
