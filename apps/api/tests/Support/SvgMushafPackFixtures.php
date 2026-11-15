<?php

declare(strict_types=1);

use App\Domains\Mushaf\Enums\WordBoxesStatus;
use App\Domains\Mushaf\Models\SvgMushaf;
use App\Domains\Mushaf\Sources\SvgMushafStore;
use App\Support\Storage\SourceCache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\ParallelTesting;

/*
| Synthetic SVG mushaf editions for the pack tests (ADR 0090). Page bytes are placeholder gzip text («FIXTURE page N»), polygons
| are a unit square and coordinates are plain numbers. No Quran artwork or text. The editions live in their own cache folders
| (`mushafs/fixture-pack-{key}`), so a real import in the same cache is never touched.
*/

const SVG_PACK_FIXTURE_POLYGON = 'M 0 0 L 1 0 L 1 1 L 0 1 Z';

/**
 * Each parallel test process gets its own fixture files, so one file's teardown never deletes another's.
 */
function svgPackFixtureSuffix(): string
{
    $token = ParallelTesting::token();

    return $token === false ? '' : '-p'.$token;
}

function svgPackFixtureManifest(): string
{
    return 'svg-mushaf/test-pack'.svgPackFixtureSuffix().'-manifest.json';
}

function svgPackFixtureBase(string $key): string
{
    return 'mushafs/fixture-pack'.svgPackFixtureSuffix().'-'.$key;
}

function svgPackFixtureCacheDirectory(string $key): string
{
    return SourceCache::path('svg-mushaf/'.config('mushaf.commit').'/'.svgPackFixtureBase($key));
}

function svgPackFixtureTearDown(): void
{
    foreach (['hafs', 'warsh', 'qalun', 'shubah', 'duri'] as $key) {
        File::deleteDirectory(svgPackFixtureCacheDirectory($key));
    }

    File::delete(resource_path(svgPackFixtureManifest()));

    foreach (glob(resource_path('svg-mushaf/test-pack'.svgPackFixtureSuffix().'-boxes-*.json')) ?: [] as $file) {
        File::delete($file);
    }
}

/**
 * Two pages, three ayah regions (the second page holds a continuation with no labels) and two word boxes. Returns the edition.
 * Hafs also gets its two word boxes; the other editions are given none, so tests can prove they never carry any.
 */
function svgPackSeedEdition(string $key, int $pages = 2): SvgMushaf
{
    config(['mushaf.pages' => $pages]);
    svgPackWriteManifest();

    $mushaf = SvgMushaf::query()->create([
        'key' => $key,
        'folder' => (string) config('mushaf.editions.'.$key.'.folder'),
        'edition_year' => 1441,
        'source_commit' => (string) config('mushaf.commit'),
        'page_count' => $pages,
        'ayah_count' => 3,
        'imported_at' => now(),
    ]);

    $store = app(SvgMushafStore::class);
    $now = now()->format('Y-m-d H:i:s.u');

    for ($page = 1; $page <= $pages; $page++) {
        $gz = (string) gzencode('FIXTURE page '.$page.' — not artwork', 9);
        $store->write(svgPackFixtureBase($key), sprintf('svg/%03d.svg.gz', $page), $gz);

        DB::table('svg_mushaf_pages')->insert([
            'svg_mushaf_id' => $mushaf->id,
            'page' => $page,
            'svg_blob_sha' => str_repeat('a', 40),
            'svg_bytes' => 10,
            'gz_sha256' => hash('sha256', $gz),
            'gz_bytes' => strlen($gz),
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    DB::table('svg_mushaf_ayah_regions')->insert([
        ['svg_mushaf_id' => $mushaf->id, 'page' => 1, 'surah' => 1, 'ayah' => 1, 'label_x' => 10.5, 'label_y' => 20.25, 'polygon' => SVG_PACK_FIXTURE_POLYGON],
        ['svg_mushaf_id' => $mushaf->id, 'page' => 1, 'surah' => 1, 'ayah' => 2, 'label_x' => 30.5, 'label_y' => 40.25, 'polygon' => SVG_PACK_FIXTURE_POLYGON],
        ['svg_mushaf_id' => $mushaf->id, 'page' => 2, 'surah' => 1, 'ayah' => 2, 'label_x' => null, 'label_y' => null, 'polygon' => SVG_PACK_FIXTURE_POLYGON],
    ]);

    if ($key === 'hafs') {
        DB::table('svg_mushaf_word_boxes')->insert([
            ['svg_mushaf_id' => $mushaf->id, 'page' => 1, 'line' => 1, 'surah' => 1, 'ayah' => 1, 'position' => 1, 'x0' => '10.5', 'y0' => '20.25', 'x1' => '30.5', 'y1' => '40.25', 'created_at' => $now, 'updated_at' => $now],
            ['svg_mushaf_id' => $mushaf->id, 'page' => 1, 'line' => 1, 'surah' => 1, 'ayah' => 2, 'position' => 1, 'x0' => '50', 'y0' => '20', 'x1' => '70', 'y1' => '40', 'created_at' => $now, 'updated_at' => $now],
        ]);
    }

    return $mushaf;
}

/**
 * Points the config at a manifest that names every fixture edition's base folder. The downloader reads only the bases.
 */
function svgPackWriteManifest(): void
{
    $editions = [];

    foreach (['hafs', 'warsh', 'qalun', 'shubah', 'duri'] as $key) {
        $editions[$key] = ['base' => svgPackFixtureBase($key)];
    }

    File::ensureDirectoryExists(dirname(resource_path(svgPackFixtureManifest())));
    File::put(resource_path(svgPackFixtureManifest()), json_encode([
        'commit' => config('mushaf.commit'),
        'editions' => $editions,
    ], JSON_THROW_ON_ERROR));

    config(['mushaf.manifest' => svgPackFixtureManifest()]);
}

/**
 * Marks Hafs as approved: the status, the pin in config, and a committed-file stand-in whose digest matches.
 */
function svgPackApproveHafs(SvgMushaf $mushaf, string $digest): void
{
    $mushaf->forceFill(['word_boxes_status' => WordBoxesStatus::Approved, 'word_boxes_digest' => $digest])->save();
    config([
        'mushaf.approved_word_boxes.hafs' => $digest,
        'mushaf.word_box_files.output' => 'svg-mushaf/test-pack'.svgPackFixtureSuffix().'-boxes-%s.json',
    ]);
    File::put(resource_path('svg-mushaf/test-pack'.svgPackFixtureSuffix().'-boxes-hafs.json'), json_encode(['digest' => $digest], JSON_THROW_ON_ERROR));
}
