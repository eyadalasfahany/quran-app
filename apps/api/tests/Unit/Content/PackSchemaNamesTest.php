<?php

declare(strict_types=1);

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Packs\PackSchema;
use App\Domains\Content\Packs\PackTable;

it('declares the four names tables in contract order', function (): void {
    $tables = PackSchema::tablesFor(ResourceGroup::Names);

    expect(array_map(fn (PackTable $table): string => $table->name, $tables))->toBe([
        'names_lists',
        'names',
        'names_verses',
        'names_notes',
    ]);
});

it('keys every names table by resource_id first and orders it by primary key', function (PackTable $table): void {
    expect($table->columns[0]->name)->toBe('resource_id')
        ->and($table->primaryKey[0])->toBe('resource_id')
        ->and($table->orderBy)->toBe($table->primaryKey);
})->with(fn (): array => array_map(
    fn (PackTable $table): array => [$table],
    PackSchema::tablesFor(ResourceGroup::Names),
));
