<?php

declare(strict_types=1);

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Packs\PackSchema;
use App\Domains\Content\Packs\PackTable;

it('declares the seven duas tables in contract order', function (): void {
    $tables = PackSchema::tablesFor(ResourceGroup::Duas);

    expect(array_map(fn (PackTable $table): string => $table->name, $tables))->toBe([
        'dua_items',
        'dua_quran_spans',
        'dua_hadith',
        'dua_groups',
        'dua_links',
        'dua_collection_refs',
        'dua_collection_books',
    ]);
});

it('keys every duas table by resource_id first and orders it by primary key', function (PackTable $table): void {
    expect($table->columns[0]->name)->toBe('resource_id')
        ->and($table->primaryKey[0])->toBe('resource_id')
        ->and($table->orderBy)->toBe($table->primaryKey);
})->with(fn (): array => array_map(
    fn (PackTable $table): array => [$table],
    PackSchema::tablesFor(ResourceGroup::Duas),
));

it('gives every duas table the columns of the canonical contract in order', function (string $name, array $columns): void {
    $table = collect(PackSchema::tablesFor(ResourceGroup::Duas))->firstWhere('name', $name);

    expect($table)->toBeInstanceOf(PackTable::class)
        ->and(array_map(fn ($column): string => $column->name, $table->columns))->toBe($columns);
})->with([
    'items' => ['dua_items', ['resource_id', 'id', 'dua_key', 'kind', 'group_id', 'position']],
    'quran spans' => ['dua_quran_spans', ['resource_id', 'item_id', 'surah', 'verse_from', 'verse_to']],
    'hadith' => ['dua_hadith', ['resource_id', 'item_id', 'hadeeth_id', 'title', 'hadeeth', 'attribution', 'grade', 'explanation', 'reference', 'hints', 'text_search', 'source_url']],
    'groups' => ['dua_groups', ['resource_id', 'id', 'source_category_id', 'title', 'position']],
    'links' => ['dua_links', ['resource_id', 'id', 'item_id', 'hadeeth_id', 'entry_key']],
    'collection refs' => ['dua_collection_refs', ['resource_id', 'id', 'item_id', 'collection_slug', 'hadith_number']],
    'collection books' => ['dua_collection_books', ['resource_id', 'id', 'collection_slug', 'book_number', 'position']],
]);

it('omits server-only columns from the duas pack contract', function (): void {
    $packed = [];

    foreach (PackSchema::tablesFor(ResourceGroup::Duas) as $table) {
        foreach ($table->columns as $column) {
            $packed[] = $table->name.'.'.$column->name;
        }
    }

    expect($packed)->not->toContain('dua_items.source_id')
        ->and($packed)->not->toContain('dua_items.source_key')
        ->and($packed)->not->toContain('dua_quran_spans.review_status')
        ->and($packed)->not->toContain('dua_quran_spans.rule')
        ->and($packed)->not->toContain('dua_hadith.source_id')
        ->and($packed)->not->toContain('dua_hadith.source_key')
        ->and($packed)->not->toContain('dua_hadith.source_text_sha256')
        ->and($packed)->not->toContain('dua_hadith.source_version')
        ->and($packed)->not->toContain('dua_hadith.imported_at')
        ->and($packed)->not->toContain('dua_links.review_status')
        ->and($packed)->not->toContain('dua_links.evidence')
        ->and($packed)->not->toContain('dua_collection_refs.review_status')
        ->and($packed)->not->toContain('dua_collection_refs.evidence');
});
