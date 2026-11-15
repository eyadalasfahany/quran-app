<?php

declare(strict_types=1);

use App\Domains\Seerah\Models\SeerahEvent;
use App\Domains\Seerah\Models\SeerahParagraph;
use App\Domains\Seerah\Models\SeerahPlace;
use Database\Factories\SeerahParagraphFactory;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

it('creates the twelve seerah tables', function (): void {
    foreach ([
        'seerah_books', 'seerah_sections', 'seerah_paragraphs', 'seerah_places', 'seerah_map_levels', 'seerah_map_positions',
        'seerah_routes', 'seerah_route_stops', 'seerah_map_route_paths', 'seerah_events', 'seerah_event_evidence', 'seerah_milestones',
    ] as $table) {
        expect(Schema::hasTable($table))->toBeTrue();
    }
});

it('stores the book text in the binary collation and the hashes in the default one', function (): void {
    $collations = DB::select(
        "select TABLE_NAME, COLUMN_NAME, COLLATION_NAME from information_schema.COLUMNS where TABLE_SCHEMA = database() and TABLE_NAME = 'seerah_paragraphs'",
    );

    $byName = [];

    foreach ($collations as $column) {
        $byName[$column->COLUMN_NAME] = $column->COLLATION_NAME;
    }

    expect($byName['text_ar'])->toBe('utf8mb4_0900_bin')
        ->and($byName['text_sha256'])->toBe('utf8mb4_0900_ai_ci');
});

it('keeps slugs unique within one resource', function (): void {
    $place = SeerahPlace::factory()->create(['slug' => 'fixture-unique-place']);

    expect(fn () => SeerahPlace::factory()->create(['resource_id' => $place->resource_id, 'id' => 99, 'slug' => 'fixture-unique-place']))
        ->toThrow(QueryException::class);
});

it('keeps an event id once per resource', function (): void {
    $event = SeerahEvent::factory()->create();

    expect(fn () => SeerahEvent::factory()->create(['resource_id' => $event->resource_id, 'id' => $event->id, 'slug' => 'fixture-other']))
        ->toThrow(QueryException::class);
});

it('round-trips a paragraph with diacritics and bidirectional marks byte for byte', function (): void {
    // Placeholder characters that carry the risk: a dagger alef, a tatweel, a bidi mark, an isolate and a combining mark.
    $text = "FIXTURE \u{0670}\u{0640}\u{200F}\u{2067}\u{0651}\u{064E} \u{200E}\u{2069}  end\n";

    $paragraph = SeerahParagraphFactory::new()->create(['id' => 4242, 'text_ar' => $text]);

    $stored = SeerahParagraph::query()->where('id', 4242)->value('text_ar');

    expect(bin2hex((string) $stored))->toBe(bin2hex($text))
        ->and($paragraph->text_ar)->toBe($text);
});

it('does not keep a Quran text column in the seerah tables', function (): void {
    $columns = DB::select(
        "select COLUMN_NAME from information_schema.COLUMNS where TABLE_SCHEMA = database() and TABLE_NAME like 'seerah\\_%'",
    );

    foreach ($columns as $column) {
        expect($column->COLUMN_NAME)->not->toContain('quran');
    }
});
