<?php

declare(strict_types=1);

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Enums\ServedResourceGroup;
use App\Domains\Content\Packs\PackColumn;
use App\Domains\Content\Packs\PackSchema;
use App\Domains\Content\Packs\PackTable;

it('declares the two explanation tables in contract order, keyed by resource_id', function (): void {
    $tables = PackSchema::tablesFor(ResourceGroup::HadithExplanations);

    expect(array_map(fn (PackTable $table): string => $table->name, $tables))->toBe(['hadith_explanations', 'hadith_explanation_links'])
        ->and(array_map(fn (PackTable $table): string => $table->columns[0]->name, $tables))->toBe(['resource_id', 'resource_id'])
        ->and(array_map(fn (PackTable $table): array => $table->primaryKey, $tables))->toBe([
            ['resource_id', 'id'],
            ['resource_id', 'collection_slug', 'hadith_number', 'explanation_id'],
        ]);
});

it('packs the text as received and leaves out the grade and the server-only review fields', function (): void {
    $packed = [];

    foreach (PackSchema::tablesFor(ResourceGroup::HadithExplanations) as $table) {
        foreach ($table->columns as $column) {
            $packed[] = $table->name.'.'.$column->name;
        }
    }

    expect($packed)->toBe([
        'hadith_explanations.resource_id',
        'hadith_explanations.id',
        'hadith_explanations.title_ar',
        'hadith_explanations.attribution_ar',
        'hadith_explanations.reference_ar',
        'hadith_explanations.body_ar',
        'hadith_explanations.benefits_ar',
        'hadith_explanations.words_ar',
        'hadith_explanations.intro_ar',
        'hadith_explanations.source_url',
        'hadith_explanation_links.resource_id',
        'hadith_explanation_links.collection_slug',
        'hadith_explanation_links.hadith_number',
        'hadith_explanation_links.explanation_id',
    ])->and(array_filter($packed, fn (string $name): bool => str_contains($name, 'grade') || str_ends_with($name, '.status') || str_ends_with($name, '.evidence') || str_ends_with($name, 'source_sha256')))->toBe([]);
});

it('declares the nullable text columns and the integer columns of the explanations table', function (): void {
    $table = collect(PackSchema::tablesFor(ResourceGroup::HadithExplanations))->firstWhere('name', 'hadith_explanations');

    expect($table)->toBeInstanceOf(PackTable::class)
        ->and(array_values(array_map(fn (PackColumn $column): string => $column->name, array_filter($table->columns, fn (PackColumn $column): bool => $column->nullable))))
        ->toBe(['title_ar', 'attribution_ar', 'reference_ar', 'body_ar', 'benefits_ar', 'words_ar', 'intro_ar'])
        ->and(array_values(array_map(fn (PackColumn $column): string => $column->name, array_filter($table->columns, fn (PackColumn $column): bool => $column->integer))))
        ->toBe(['resource_id', 'id']);
});

it('adds hadith_explanations to both group enums with the same value', function (): void {
    expect(ResourceGroup::HadithExplanations->value)->toBe('hadith_explanations')
        ->and(ServedResourceGroup::HadithExplanations->value)->toBe('hadith_explanations')
        ->and(ResourceGroup::HadithExplanations->isIgnored())->toBeFalse()
        ->and(ServedResourceGroup::fromResourceGroup(ResourceGroup::HadithExplanations))->toBe(ServedResourceGroup::HadithExplanations);
});
