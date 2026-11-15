<?php

declare(strict_types=1);

require_once __DIR__.'/Support/seerah-helpers.php';

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Packs\PackBuildException;
use App\Domains\Content\Services\ContentDeliveryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\Support\SeerahFixture;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    SeerahFixture::applyConfig();
    Storage::fake('local');
});

it('builds a pack with the twelve seerah tables and the meta of the group', function (): void {
    seerahFixtureImport();
    $resource = Resource::query()->where('group', 'seerah')->firstOrFail();

    $pack = seerahPackOf($resource->id);
    $pdo = seerahPackOpen(Storage::disk('local')->get($pack->path));

    $tables = $pdo->query("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'seerah_%' ORDER BY name")->fetchAll(PDO::FETCH_COLUMN);
    $meta = array_column($pdo->query('SELECT key, value FROM meta')->fetchAll(), 'value', 'key');

    expect($tables)->toHaveCount(12)
        ->and($meta)->toMatchArray([
            'group' => ResourceGroup::Seerah->value,
            'pack_schema_version' => '1',
            'resource_id' => (string) $resource->id,
        ])
        ->and(count(seerahPackRows($pdo, 'seerah_paragraphs')))->toBe(5)
        ->and(count(seerahPackRows($pdo, 'seerah_events')))->toBe(3)
        ->and($pack->rowCount)->toBe(array_sum(array_map(
            fn (string $table): int => count(seerahPackRows($pdo, $table)),
            $tables,
        )));
});

it('keeps every paragraph byte for byte in the pack', function (): void {
    seerahFixtureImport();
    $resource = Resource::query()->where('group', 'seerah')->firstOrFail();
    $pdo = seerahPackOpen(Storage::disk('local')->get(seerahPackOf($resource->id)->path));

    foreach (seerahPackRows($pdo, 'seerah_paragraphs') as $row) {
        $code = sprintf('p%05d', $row['id']);

        expect(bin2hex((string) $row['text_ar']))->toBe(bin2hex(SeerahFixture::PARAGRAPHS[$code]));
    }
});

it('stores the coordinates as REAL numbers', function (): void {
    seerahFixtureImport();
    $resource = Resource::query()->where('group', 'seerah')->firstOrFail();
    $pdo = seerahPackOpen(Storage::disk('local')->get(seerahPackOf($resource->id)->path));

    $city = $pdo->query("SELECT typeof(lat) AS kind, lat, lng FROM seerah_places WHERE slug = 'fx-city'")->fetch();

    expect($city)->toMatchArray(['kind' => 'real', 'lat' => 21.4, 'lng' => 39.8]);
});

it('packs the art landmark flag as an INTEGER 1 or 0', function (): void {
    seerahFixtureImport();
    $resource = Resource::query()->where('group', 'seerah')->firstOrFail();
    $pdo = seerahPackOpen(Storage::disk('local')->get(seerahPackOf($resource->id)->path));

    $flags = $pdo->query(
        'SELECT p.slug, typeof(m.art_landmark) AS kind, m.art_landmark FROM seerah_map_positions m JOIN seerah_places p ON p.id = m.place_id ORDER BY p.slug'
    )->fetchAll();

    expect($flags)->toBe([
        ['slug' => 'fx-city', 'kind' => 'integer', 'art_landmark' => 0],
        ['slug' => 'fx-landmark', 'kind' => 'integer', 'art_landmark' => 1],
        ['slug' => 'fx-region', 'kind' => 'integer', 'art_landmark' => 0],
    ]);
});

it('packs no review, provenance or import column', function (): void {
    seerahFixtureImport();
    $resource = Resource::query()->where('group', 'seerah')->firstOrFail();
    $pdo = seerahPackOpen(Storage::disk('local')->get(seerahPackOf($resource->id)->path));

    $names = [];
    $tables = $pdo->query("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'seerah_%'")->fetchAll(PDO::FETCH_COLUMN);

    foreach ($tables as $table) {
        foreach ($pdo->query('PRAGMA table_info('.$table.')')->fetchAll() as $column) {
            $names[] = $table.'.'.$column['name'];
        }
    }

    foreach (['source_id', 'source_version', 'source_sha256', 'canonical_sha256', 'imported_at', 'geo_source', 'text_sha256', 'origin', 'review_status', 'signed_by'] as $hidden) {
        expect(array_filter($names, fn (string $name): bool => str_ends_with($name, '.'.$hidden)))->toBe([]);
    }
});

it('lists the book in the content manifest only once its pack is built', function (): void {
    seerahFixtureImport();
    $resource = Resource::query()->where('group', 'seerah')->firstOrFail();

    $before = array_filter(
        app(ContentDeliveryService::class)->manifest()->resources,
        fn ($entry): bool => $entry->group === ResourceGroup::Seerah,
    );

    seerahPackOf($resource->id);

    $after = array_values(array_filter(
        app(ContentDeliveryService::class)->manifest()->resources,
        fn ($entry): bool => $entry->group === ResourceGroup::Seerah,
    ));

    expect($before)->toBe([])
        ->and($after)->toHaveCount(1)
        ->and($after[0]->id)->toBe($resource->id)
        ->and($after[0]->version)->toBe(1);
});

it('refuses to build a pack for a seerah resource with no imported book', function (): void {
    $sourceId = DB::table('content_sources')->where('code', 'openiti')->value('id');
    $resourceId = DB::table('resources')->insertGetId([
        'source_id' => $sourceId,
        'group' => 'seerah',
        'source_key' => 'not-imported',
        'name' => 'FIXTURE',
        'language_code' => 'ar',
        'direction' => 'rtl',
        'version' => 1,
        'is_active' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    expect(fn () => seerahPackOf($resourceId))->toThrow(PackBuildException::class, 'The Seerah book is not imported.');
});
