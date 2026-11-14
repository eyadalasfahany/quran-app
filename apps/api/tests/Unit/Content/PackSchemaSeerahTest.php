<?php

declare(strict_types=1);

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Enums\ServedResourceGroup;
use App\Domains\Content\Packs\PackColumn;
use App\Domains\Content\Packs\PackSchema;
use App\Domains\Content\Packs\PackTable;

it('declares the twelve seerah tables in contract order', function (): void {
    $tables = PackSchema::tablesFor(ResourceGroup::Seerah);

    expect(array_map(fn (PackTable $table): string => $table->name, $tables))->toBe([
        'seerah_books',
        'seerah_sections',
        'seerah_paragraphs',
        'seerah_places',
        'seerah_map_levels',
        'seerah_map_positions',
        'seerah_routes',
        'seerah_route_stops',
        'seerah_map_route_paths',
        'seerah_events',
        'seerah_event_evidence',
        'seerah_milestones',
    ]);
});

it('keys every seerah table by resource_id first', function (PackTable $table): void {
    expect($table->columns[0]->name)->toBe('resource_id')
        ->and($table->primaryKey[0])->toBe('resource_id')
        ->and($table->orderBy[0])->toBe('resource_id');
})->with(fn (): array => array_map(
    fn (PackTable $table): array => [$table],
    PackSchema::tablesFor(ResourceGroup::Seerah),
));

it('uses the contract primary keys', function (): void {
    $keys = [];

    foreach (PackSchema::tablesFor(ResourceGroup::Seerah) as $table) {
        $keys[$table->name] = $table->primaryKey;
    }

    expect($keys)->toBe([
        'seerah_books' => ['resource_id', 'id'],
        'seerah_sections' => ['resource_id', 'id'],
        'seerah_paragraphs' => ['resource_id', 'id'],
        'seerah_places' => ['resource_id', 'id'],
        'seerah_map_levels' => ['resource_id', 'level'],
        'seerah_map_positions' => ['resource_id', 'level', 'place_id'],
        'seerah_routes' => ['resource_id', 'id'],
        'seerah_route_stops' => ['resource_id', 'route_id', 'position'],
        'seerah_map_route_paths' => ['resource_id', 'level', 'route_id', 'from_place_id', 'to_place_id'],
        'seerah_events' => ['resource_id', 'id'],
        'seerah_event_evidence' => ['resource_id', 'event_id', 'kind', 'position'],
        'seerah_milestones' => ['resource_id', 'milestone_key'],
    ]);
});

it('stores the coordinates and drawn positions as REAL and everything else as INTEGER or TEXT', function (): void {
    $real = [];

    foreach (PackSchema::tablesFor(ResourceGroup::Seerah) as $table) {
        foreach ($table->columns as $column) {
            if ($column->real) {
                $real[] = $table->name.'.'.$column->name;
            }
        }
    }

    expect($real)->toBe(['seerah_places.lat', 'seerah_places.lng', 'seerah_map_positions.x', 'seerah_map_positions.y'])
        ->and(PackSchema::seerahPlaces()->createSql())->toContain('lat REAL')
        ->and(PackSchema::seerahPlaces()->createSql())->toContain('slug TEXT NOT NULL');
});

it('packs no review, provenance or import column', function (): void {
    $names = [];

    foreach (PackSchema::tablesFor(ResourceGroup::Seerah) as $table) {
        foreach ($table->columns as $column) {
            $names[] = $table->name.'.'.$column->name;
        }
    }

    foreach (['source_id', 'source_version', 'source_sha256', 'canonical_sha256', 'imported_at', 'geo_source', 'text_sha256', 'origin', 'review_status', 'note', 'order_exception', 'signed_by'] as $hidden) {
        expect(array_filter($names, fn (string $name): bool => str_ends_with($name, '.'.$hidden)))->toBe([]);
    }
});

it('gives the book text the columns the app reads, in order', function (string $name, array $columns): void {
    $table = collect(PackSchema::tablesFor(ResourceGroup::Seerah))->firstWhere('name', $name);

    expect($table)->toBeInstanceOf(PackTable::class)
        ->and(array_map(fn (PackColumn $column): string => $column->name, $table->columns))->toBe($columns);
})->with([
    'books' => ['seerah_books', ['resource_id', 'id', 'slug', 'title_ar', 'author_ar', 'edition_ar', 'attribution_ar', 'attribution_en', 'sections_count', 'paragraphs_count', 'places_count', 'events_count', 'routes_count']],
    'sections' => ['seerah_sections', ['resource_id', 'id', 'code', 'level', 'title_ar', 'page', 'position', 'paragraph_from', 'paragraph_to']],
    'paragraphs' => ['seerah_paragraphs', ['resource_id', 'id', 'section_id', 'position', 'page', 'text_ar']],
    'events' => ['seerah_events', ['resource_id', 'id', 'slug', 'position', 'section_id', 'paragraph_from', 'paragraph_to', 'title_ar', 'kind', 'place_id', 'place_basis', 'also', 'age_from', 'age_to', 'era', 'hijri_from', 'hijri_to', 'year_basis', 'certainty', 'route_id', 'flags']],
    'evidence' => ['seerah_event_evidence', ['resource_id', 'event_id', 'kind', 'position', 'paragraph_id', 'quote_ar']],
    'milestones' => ['seerah_milestones', ['resource_id', 'milestone_key', 'label_ar', 'event_id', 'position']],
]);

it('adds seerah to both group enums with the same value', function (): void {
    expect(ResourceGroup::Seerah->value)->toBe('seerah')
        ->and(ServedResourceGroup::fromResourceGroup(ResourceGroup::Seerah))->toBe(ServedResourceGroup::Seerah)
        ->and(ResourceGroup::Seerah->isIgnored())->toBeFalse();
});
