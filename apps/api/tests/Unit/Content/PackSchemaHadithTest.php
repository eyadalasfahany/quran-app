<?php

declare(strict_types=1);

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Enums\ServedResourceGroup;
use App\Domains\Content\Packs\PackBuildException;
use App\Domains\Content\Packs\PackColumn;
use App\Domains\Content\Packs\PackSchema;
use App\Domains\Content\Packs\PackTable;

it('declares the six hadith tables in contract order', function (): void {
    $tables = PackSchema::tablesFor(ResourceGroup::HadithCollections);

    expect(array_map(fn (PackTable $table): string => $table->name, $tables))->toBe([
        'hadith_collections',
        'hadith_books',
        'hadith_chapters',
        'hadith_entries',
        'hadith_grades',
        'hadith_ref_aliases',
    ]);
});

it('keys every hadith table by resource_id first and orders it by primary key', function (PackTable $table): void {
    expect($table->columns[0]->name)->toBe('resource_id')
        ->and($table->primaryKey[0])->toBe('resource_id')
        ->and($table->orderBy)->toBe($table->primaryKey);
})->with(fn (): array => array_map(
    fn (PackTable $table): array => [$table],
    PackSchema::tablesFor(ResourceGroup::HadithCollections),
));

it('uses the contract primary keys', function (): void {
    $keys = [];

    foreach (PackSchema::tablesFor(ResourceGroup::HadithCollections) as $table) {
        $keys[$table->name] = $table->primaryKey;
    }

    expect($keys)->toBe([
        'hadith_collections' => ['resource_id', 'id'],
        'hadith_books' => ['resource_id', 'id'],
        'hadith_chapters' => ['resource_id', 'id'],
        'hadith_entries' => ['resource_id', 'id'],
        'hadith_grades' => ['resource_id', 'id'],
        'hadith_ref_aliases' => ['resource_id', 'old_number', 'since_version'],
    ]);
});

it('gives every hadith table the columns of the canonical contract in order', function (string $name, array $columns): void {
    $table = collect(PackSchema::tablesFor(ResourceGroup::HadithCollections))->firstWhere('name', $name);

    expect($table)->toBeInstanceOf(PackTable::class)
        ->and(array_map(fn (PackColumn $column): string => $column->name, $table->columns))->toBe($columns);
})->with([
    'collections' => ['hadith_collections', ['resource_id', 'id', 'slug', 'source_code', 'title_ar', 'title_en', 'author_ar', 'author_en', 'attribution_ar', 'attribution_en', 'source_url', 'total_hadith', 'books_count']],
    'books' => ['hadith_books', ['resource_id', 'id', 'book_number', 'title_ar', 'title_en', 'position', 'hadith_count']],
    'chapters' => ['hadith_chapters', ['resource_id', 'id', 'book_id', 'chapter_number', 'source_chapter_key', 'title_ar', 'title_en', 'position', 'hadith_count']],
    'entries' => ['hadith_entries', ['resource_id', 'id', 'book_id', 'chapter_id', 'hadith_number', 'arabic_number', 'position', 'text_ar', 'text_en', 'narrator_en', 'text_search', 'source_url']],
    'grades' => ['hadith_grades', ['resource_id', 'id', 'entry_id', 'grade', 'graded_by']],
    'ref aliases' => ['hadith_ref_aliases', ['resource_id', 'old_number', 'new_number', 'match', 'since_version']],
]);

it('declares nullability and kinds as the backend does', function (): void {
    $expected = [
        'hadith_collections' => [
            'nullable' => ['title_ar', 'title_en', 'author_ar', 'author_en', 'source_url'],
            'integer' => ['resource_id', 'id', 'total_hadith', 'books_count'],
        ],
        'hadith_books' => [
            'nullable' => ['title_ar', 'title_en'],
            'integer' => ['resource_id', 'id', 'position', 'hadith_count'],
        ],
        'hadith_chapters' => [
            'nullable' => ['source_chapter_key', 'title_ar', 'title_en'],
            'integer' => ['resource_id', 'id', 'book_id', 'chapter_number', 'position', 'hadith_count'],
        ],
        'hadith_entries' => [
            'nullable' => ['chapter_id', 'arabic_number', 'text_en', 'narrator_en', 'source_url'],
            'integer' => ['resource_id', 'id', 'book_id', 'chapter_id', 'position'],
        ],
        'hadith_grades' => [
            'nullable' => ['graded_by'],
            'integer' => ['resource_id', 'id', 'entry_id'],
        ],
        'hadith_ref_aliases' => [
            'nullable' => ['new_number'],
            'integer' => ['resource_id', 'since_version'],
        ],
    ];

    foreach (PackSchema::tablesFor(ResourceGroup::HadithCollections) as $table) {
        $nullable = array_values(array_map(
            fn (PackColumn $column): string => $column->name,
            array_filter($table->columns, fn (PackColumn $column): bool => $column->nullable),
        ));
        $integer = array_values(array_map(
            fn (PackColumn $column): string => $column->name,
            array_filter($table->columns, fn (PackColumn $column): bool => $column->integer),
        ));

        expect($nullable)->toBe($expected[$table->name]['nullable'])
            ->and($integer)->toBe($expected[$table->name]['integer']);
    }
});

it('omits server-only columns from every hadith table', function (): void {
    $packed = [];

    foreach (PackSchema::tablesFor(ResourceGroup::HadithCollections) as $table) {
        foreach ($table->columns as $column) {
            $packed[] = $table->name.'.'.$column->name;
        }
    }

    foreach (['source_id', 'source_key', 'source_text_sha256', 'source_version', 'imported_at'] as $serverOnly) {
        expect(array_filter($packed, fn (string $name): bool => str_ends_with($name, '.'.$serverOnly)))->toBe([]);
    }
});

it('adds hadith_collections to both group enums with the same value', function (): void {
    expect(ResourceGroup::HadithCollections->value)->toBe('hadith_collections')
        ->and(ServedResourceGroup::HadithCollections->value)->toBe('hadith_collections')
        ->and(ResourceGroup::HadithCollections->isIgnored())->toBeFalse()
        ->and(ServedResourceGroup::fromResourceGroup(ResourceGroup::HadithCollections))->toBe(ServedResourceGroup::HadithCollections);
});

it('leaves the reserved hadith group without a pack schema', function (): void {
    expect(fn () => PackSchema::tablesFor(ResourceGroup::Hadith))->toThrow(PackBuildException::class);
});

it('keeps the pack schema version at 1', function (): void {
    expect(PackSchema::VERSION)->toBe(1);
});
