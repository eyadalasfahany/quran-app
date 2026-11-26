<?php

declare(strict_types=1);

use App\Domains\Mushaf\Enums\WordBoxesStatus;
use App\Domains\Mushaf\Models\SvgMushaf;
use App\Domains\Mushaf\Packs\Tqp\TqpEncoder;
use App\Domains\Mushaf\Sources\SvgMushafDownloader;
use App\Domains\Mushaf\Sources\SvgMushafStore;
use App\Support\Storage\SourceCache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\ParallelTesting;

/*
| Synthetic SVG mushaf editions for the pack tests (ADR 0090). Each page is a small synthetic SVG («FIXTURE — not artwork»), drawn
| from its key and page number so every page differs; polygons are a unit square and coordinates are plain numbers. No Quran
| artwork or text. The editions live in their own cache folders (`mushafs/fixture-pack-{key}`), so a real import in the same
| cache is never touched.
*/

const SVG_PACK_FIXTURE_POLYGON = 'M 0 0 L 1 0 L 1 1 L 0 1 Z';

const SVG_PACK_FIXTURE_PAGES = 3;

/** Page 2 has a non-zero viewBox origin, as Hafs pages 1 and 2 do, so the pack's origin columns are exercised. */
function svgPackFixtureSvg(string $key, int $page): string
{
    $viewBox = $page === 2 ? '-10.5 -20.25 345 550' : '0 0 345 550';

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'.$viewBox.'"><!-- FIXTURE — not artwork: '.$key.' page '.$page.' -->'
        .'<g transform="translate(0 0)"><g id="content"><path d="M 0 0 L '.$page.' 0 L '.$page.' 1 Z"/></g></g></svg>';
}

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
    // The cache folder is the edition's source folder, which is what the pack builder reads (it differs from the key for duri).
    return 'mushafs/fixture-pack'.svgPackFixtureSuffix().'-'.config('mushaf.editions.'.$key.'.folder');
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

    foreach (array_merge(glob(resource_path('svg-mushaf/test-pack'.svgPackFixtureSuffix().'-boxes-*.json')) ?: [], glob(resource_path('svg-mushaf/test-pack'.svgPackFixtureSuffix().'-contours-*.json')) ?: []) as $file) {
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
    $encoder = new TqpEncoder;
    $now = now()->format('Y-m-d H:i:s.u');

    for ($page = 1; $page <= $pages; $page++) {
        $relative = sprintf('svg/%03d.svg', $page);
        $svg = svgPackFixtureSvg($key, $page);
        $store->write(svgPackFixtureBase($key), $relative, $svg);
        $gzip = $store->writeGzip(svgPackFixtureBase($key), $relative, $svg);
        $container = $encoder->container($svg);

        DB::table('svg_mushaf_pages')->insert([
            'svg_mushaf_id' => $mushaf->id,
            'page' => $page,
            'svg_blob_sha' => SvgMushafDownloader::blobSha($svg),
            'svg_bytes' => strlen($svg),
            'gz_sha256' => $gzip['sha256'],
            'gz_bytes' => $gzip['bytes'],
            'tqp_sha256' => hash('sha256', $container),
            'tqp_bytes' => strlen($container),
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
 * Points the config at a manifest that pins every fixture page (A1: the page SVG's blob SHA and size). The pins are a function of
 * the key and page, so every edition can be seeded in any order and the manifest never changes between tests. The JSON pins are
 * placeholders: the pack reads only the SVGs.
 */
function svgPackWriteManifest(): void
{
    $editions = [];

    foreach (['hafs', 'warsh', 'qalun', 'shubah', 'duri'] as $key) {
        $pages = [];

        for ($page = 1; $page <= SVG_PACK_FIXTURE_PAGES; $page++) {
            $svg = svgPackFixtureSvg($key, $page);
            $pages[] = [SvgMushafDownloader::blobSha($svg), strlen($svg), SvgMushafDownloader::blobSha(''), 0];
        }

        $editions[(string) config('mushaf.editions.'.$key.'.folder')] = ['base' => svgPackFixtureBase($key), 'pages' => $pages];
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

/**
 * Marks the contour map approved: the status, the pin in config and a committed-file stand-in whose digest matches (ADR 0090 A3).
 */
function svgPackApproveContours(SvgMushaf $mushaf, string $digest): void
{
    $mushaf->forceFill(['contours_status' => WordBoxesStatus::Approved, 'contours_digest' => $digest])->save();
    config([
        'mushaf.approved_word_contours.hafs' => $digest,
        'mushaf.word_box_files.contour_output' => 'svg-mushaf/test-pack'.svgPackFixtureSuffix().'-contours-%s.json',
    ]);
    File::put(resource_path('svg-mushaf/test-pack'.svgPackFixtureSuffix().'-contours-hafs.json'), json_encode(['digest' => $digest], JSON_THROW_ON_ERROR));
}

/**
 * One word run and one title block on page 1 of an edition, so a pack that carries contours has rows to show. Synthetic numbers.
 */
function svgPackSeedContours(SvgMushaf $mushaf, string $status, string $digest): void
{
    $mushaf->forceFill(['contours_status' => $status, 'contours_digest' => $digest])->save();

    DB::table('svg_mushaf_word_contours')->insert([
        'svg_mushaf_id' => $mushaf->id, 'surah' => 1, 'ayah' => 1, 'position' => 1, 'first' => 0, 'count' => 1, 'flag' => 0,
        'created_at' => now(), 'updated_at' => now(),
    ]);
    DB::table('svg_mushaf_contour_blocks')->insert([
        'svg_mushaf_id' => $mushaf->id, 'page' => 1, 'kind' => 1, 'ord' => 0, 'surah' => 0, 'ayah' => 0, 'first' => 1, 'count' => 1,
        'x0' => 32, 'y0' => 64, 'x1' => 320, 'y1' => 96, 'created_at' => now(), 'updated_at' => now(),
    ]);
}
