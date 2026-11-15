<?php

declare(strict_types=1);

use App\Domains\Seerah\Canonical\CanonicalBuild;
use App\Domains\Seerah\Import\SeerahImportRows;
use App\Domains\Seerah\Import\SeerahRowBuilder;
use App\Domains\Seerah\Validation\ValidationRun;
use Tests\Support\SeerahFixture;
use Tests\TestCase;

// Placeholder data only (ADR 0091): every paragraph, quote and name is a marked placeholder from SeerahFixture.

uses(TestCase::class);

beforeEach(function (): void {
    SeerahFixture::applyConfig();
});

/**
 * Writes the passing fixture folder, validates it and builds the rows.
 *
 * @param  callable(array<string, array<string, mixed>>): array<string, array<string, mixed>>|null  $change
 * @return array{0: SeerahImportRows, 1: ValidationRun, 2: CanonicalBuild}
 */
function seerahRowsFixture(?callable $change = null): array
{
    $build = SeerahFixture::build();
    $directory = SeerahFixture::directory();
    $files = SeerahFixture::files($build);

    if ($change !== null) {
        $files = $change($files);
    }

    SeerahFixture::write($directory, $build, $files);
    $run = SeerahFixture::validate($directory, $build);

    expect($run->issues->hasErrors())->toBeFalse();

    return [app(SeerahRowBuilder::class)->build($run, $build), $run, $build];
}

/**
 * @param  list<array<string, int|float|string|null>>  $rows
 * @return array<string, int|float|string|null>
 */
function seerahRowWhere(array $rows, string $key, mixed $value): array
{
    $found = array_values(array_filter($rows, static fn (array $row): bool => $row[$key] === $value));

    expect($found)->toHaveCount(1);

    return $found[0];
}

it('stores every paragraph of the book byte for byte, with its SHA-256', function (): void {
    [$rows] = seerahRowsFixture();

    $paragraphs = $rows->rows('seerah_paragraphs');

    expect($paragraphs)->toHaveCount(count(SeerahFixture::PARAGRAPHS));

    foreach (SeerahFixture::PARAGRAPHS as $code => $text) {
        $row = seerahRowWhere($paragraphs, 'code', $code);

        expect($row['text_ar'])->toBe($text)
            ->and($row['id'])->toBe((int) substr($code, 1))
            ->and($row['text_sha256'])->toBe(hash('sha256', $text));
    }
});

it('numbers sections from their source codes and keeps the paragraph range of each', function (): void {
    [$rows] = seerahRowsFixture();

    $first = seerahRowWhere($rows->rows('seerah_sections'), 'code', 's001');
    $second = seerahRowWhere($rows->rows('seerah_sections'), 'code', 's002');
    $empty = seerahRowWhere($rows->rows('seerah_sections'), 'code', 's004');

    expect($first)->toMatchArray(['id' => 1, 'position' => 1, 'paragraph_from' => 1, 'paragraph_to' => 2])
        ->and($second)->toMatchArray(['id' => 2, 'paragraph_from' => 3, 'paragraph_to' => 3])
        ->and($empty['paragraph_from'])->toBeNull()
        ->and($empty['paragraph_to'])->toBeNull();
});

it('gives an event with no span the whole range of its section', function (): void {
    [$rows] = seerahRowsFixture();

    $event = seerahRowWhere($rows->rows('seerah_events'), 'slug', 'e002');

    expect($event)->toMatchArray(['id' => 2, 'position' => 2, 'section_id' => 2, 'paragraph_from' => 3, 'paragraph_to' => 3])
        ->and($event['title_ar'])->toBe('السنة الأولى');
});

it('numbers events in book order and keeps the heading as the title', function (): void {
    [$rows, $run] = seerahRowsFixture();

    $events = $rows->rows('seerah_events');

    expect(array_map(fn (array $row): string => (string) $row['slug'], $events))->toBe(['e001', 'e002', 'e003'])
        ->and(array_map(fn (array $row): int => (int) $row['id'], $events))->toBe([1, 2, 3])
        ->and($events[0]['title_ar'])->toBe($run->index->section('s001')?->title)
        ->and($events[2]['title_ar'])->toBe($run->index->section('s003')?->title)
        ->and($events[0]['also'])->toBe('[]')
        ->and($events[0]['age_from'])->toBe(53)
        ->and($events[0]['era'])->toBe('ah')
        ->and($events[0]['hijri_from'])->toBe(1);
});

it('links places through the parent ids and keeps the flags as a JSON list', function (): void {
    [$rows] = seerahRowsFixture();

    $places = $rows->rows('seerah_places');
    $region = seerahRowWhere($places, 'slug', 'fx-region');
    $city = seerahRowWhere($places, 'slug', 'fx-city');
    $other = seerahRowWhere($places, 'slug', 'other');

    expect($city['parent_id'])->toBe($region['id'])
        ->and($region['parent_id'])->toBeNull()
        ->and($city['lat'])->toBe(21.4)
        ->and($city['lng'])->toBe(39.8)
        ->and($other['lat'])->toBeNull()
        ->and(json_decode((string) $other['flags'], true))->toBe([['code' => 'not_in_book_directly', 'note' => 'FIXTURE bucket']]);
});

it('writes the drawn positions and the level of each map', function (): void {
    [$rows] = seerahRowsFixture();

    $city = seerahRowWhere($rows->rows('seerah_places'), 'slug', 'fx-city');
    $region = seerahRowWhere($rows->rows('seerah_places'), 'slug', 'fx-region');
    $cityLevel = seerahRowWhere($rows->rows('seerah_map_levels'), 'level', 'fx-city');
    $position = seerahRowWhere($rows->rows('seerah_map_positions'), 'place_id', $region['id']);

    expect($cityLevel['parent_place_id'])->toBe($city['id'])
        ->and($cityLevel['viewbox'])->toBe('0 0 1000 1000')
        ->and($position)->toMatchArray(['level' => 'region', 'x' => 700.0, 'y' => 200.0, 'label_priority' => 90, 'label_side' => 'end']);
});

it('writes art_landmark 1 for a place whose marker the art draws, and 0 where the layout leaves it out', function (): void {
    [$rows] = seerahRowsFixture();

    $landmark = seerahRowWhere($rows->rows('seerah_places'), 'slug', 'fx-landmark');
    $region = seerahRowWhere($rows->rows('seerah_places'), 'slug', 'fx-region');

    expect(seerahRowWhere($rows->rows('seerah_map_positions'), 'place_id', $landmark['id'])['art_landmark'])->toBe(1)
        ->and(seerahRowWhere($rows->rows('seerah_map_positions'), 'place_id', $region['id'])['art_landmark'])->toBe(0);
});

it('keeps each quote with its event and paragraph, one row per quote', function (): void {
    [$rows] = seerahRowsFixture();

    $evidence = $rows->rows('seerah_event_evidence');
    $eventOne = array_values(array_filter($evidence, static fn (array $row): bool => $row['event_id'] === 1));

    expect($evidence)->toHaveCount(5)
        ->and(array_map(fn (array $row): string => $row['kind'].':'.$row['paragraph_id'], $eventOne))->toBe(['place:1', 'year:2'])
        ->and($eventOne[0]['quote_ar'])->toBe('مدينة تجريبية');
});

it('points the milestone at its event and keeps its label', function (): void {
    [$rows] = seerahRowsFixture();

    expect($rows->rows('seerah_milestones'))->toBe([
        ['milestone_key' => 'birth', 'label_ar' => 'علامة تجريبية', 'event_id' => 1, 'position' => 1],
    ]);
});

it('counts the book from its own rows and carries the build hashes', function (): void {
    [$rows, , $build] = seerahRowsFixture();

    $book = $rows->rows('seerah_books')[0];

    expect($book)->toMatchArray([
        'id' => 1,
        'slug' => 'nur-al-yaqin',
        'sections_count' => 4,
        'paragraphs_count' => 5,
        'places_count' => 4,
        'events_count' => 3,
        'routes_count' => 0,
    ])
        ->and($book['canonical_sha256'])->toBe($build->canonicalSha256)
        ->and($book['source_sha256'])->toBe($build->sourceSha256)
        ->and(array_key_exists('imported_at', $book))->toBeFalse()
        ->and(array_key_exists('source_id', $book))->toBeFalse();
});

it('keeps the fingerprint equal for the same data and changes it when a value changes', function (): void {
    [$first] = seerahRowsFixture();
    [$same] = seerahRowsFixture();
    [$changed] = seerahRowsFixture(function (array $files): array {
        $files['milestones.json']['milestones'][0]['label_ar'] = 'علامة تجريبية أخرى';

        return $files;
    });

    expect($first->fingerprint())->toBe($same->fingerprint())
        ->and($changed->fingerprint())->not->toBe($first->fingerprint());
});

it('builds the same rows again from the same validated run', function (): void {
    [$rows, $run, $build] = seerahRowsFixture();

    expect(app(SeerahRowBuilder::class)->build($run, $build)->tables)->toBe($rows->tables);
});
