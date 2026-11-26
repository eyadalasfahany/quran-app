<?php

declare(strict_types=1);

use App\Domains\Mushaf\Exceptions\SvgMushafCheckException;
use App\Domains\Mushaf\Exceptions\SvgMushafSourceException;
use App\Domains\Mushaf\Exceptions\UnknownSvgMushafException;
use App\Domains\Mushaf\Models\SvgMushaf;
use App\Domains\Mushaf\Models\SvgMushafAyahRegion;
use App\Domains\Mushaf\Models\SvgMushafPage;
use App\Domains\Mushaf\Packs\Tqp\TqpEncoder;
use App\Domains\Mushaf\Services\SvgMushafImporter;
use App\Domains\Mushaf\Sources\SvgMushafDownloader;
use App\Support\Storage\SourceCache;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

// Fixture data only: placeholder page bytes, placeholder numbers and a placeholder polygon. No Quran artwork or text.

uses(RefreshDatabase::class);

const SVG_MUSHAF_FIXTURE_BASE = 'mushafs/warsh/kfqc';

const SVG_MUSHAF_FIXTURE_POLYGON = 'M 0 0 L 1 0 L 1 1 L 0 1 Z';

beforeEach(function (): void {
    Http::preventStrayRequests();
    config(['mushaf.pages' => 2, 'mushaf.editions.warsh.expected_ayahs' => null]);
    File::deleteDirectory(SourceCache::path('svg-mushaf'));
});

afterEach(function (): void {
    foreach (glob(resource_path('svg-mushaf/test-fixture-*.json')) ?: [] as $file) {
        File::delete($file);
    }
});

/**
 * Two pages. Surah 1 has 2 ayahs; surah 2 has 3, and its ayah 2 spans both pages. The rest of surah.json is zero.
 *
 * @param  array<string, mixed>  $runOn  fields that replace those of 2:2's entry on page 2, where it runs on
 * @return array<string, string>
 */
function svgMushafFixtureFiles(bool $missingAyah = false, array $runOn = []): array
{
    $base = SVG_MUSHAF_FIXTURE_BASE;
    $region = fn (int $surah, int $ayah): array => [
        'surahNumber' => $surah,
        'ayahNumber' => $ayah,
        'x' => 10.5,
        'y' => 20.25,
        'polygon' => SVG_MUSHAF_FIXTURE_POLYGON,
    ];

    $page2 = [array_merge($region(2, 2), $runOn)];

    if (! $missingAyah) {
        $page2[] = $region(2, 3);
    }

    $surahs = [];

    for ($number = 1; $number <= 114; $number++) {
        $surahs[] = ['number' => $number, 'ayahCount' => match ($number) {
            1 => 2,
            2 => 3,
            default => 0,
        }];
    }

    return [
        $base.'/svg/001.svg' => svgMushafFixturePage(1),
        $base.'/svg/002.svg' => svgMushafFixturePage(2),
        $base.'/json/001.json' => json_encode([$region(1, 1), $region(1, 2), $region(2, 1), $region(2, 2)], JSON_THROW_ON_ERROR),
        $base.'/json/002.json' => json_encode($page2, JSON_THROW_ON_ERROR),
        $base.'/json/surah.json' => json_encode($surahs, JSON_THROW_ON_ERROR),
    ];
}

/** A synthetic page (FIXTURE — not artwork) with the root group and content the TQP1 encoder needs. */
function svgMushafFixturePage(int $page): string
{
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 345 550"><!-- FIXTURE page '.$page.' — not artwork -->'
        .'<g transform="translate(0 0)"><g id="content"><path d="M 0 0 L 1 0 L 1 1 Z"/></g></g></svg>';
}

function svgMushafFixtureBlobSha(string $bytes): string
{
    return hash('sha1', 'blob '.strlen($bytes)."\0".$bytes);
}

/**
 * Writes a manifest that pins the good fixture bytes, and points config at it. Returns nothing; the file is removed afterEach.
 *
 * @param  array<string, string>  $files
 */
function installSvgMushafManifest(array $files): void
{
    $base = SVG_MUSHAF_FIXTURE_BASE;
    $pages = [];

    foreach (['001', '002'] as $number) {
        $svg = $files[$base.'/svg/'.$number.'.svg'];
        $json = $files[$base.'/json/'.$number.'.json'];
        $pages[] = [svgMushafFixtureBlobSha($svg), strlen($svg), svgMushafFixtureBlobSha($json), strlen($json)];
    }

    $surah = $files[$base.'/json/surah.json'];
    $manifest = [
        'commit' => config('mushaf.commit'),
        'editions' => [
            'warsh' => [
                'base' => $base,
                'pages' => $pages,
                'surah' => [svgMushafFixtureBlobSha($surah), strlen($surah)],
            ],
        ],
    ];

    $relative = 'svg-mushaf/test-fixture-'.Str::lower(Str::random(10)).'.json';
    File::ensureDirectoryExists(dirname(resource_path($relative)));
    File::put(resource_path($relative), json_encode($manifest, JSON_THROW_ON_ERROR));
    config(['mushaf.manifest' => $relative]);
}

/**
 * Serves the given bytes for every pinned path. A path that is not in $files answers 404.
 *
 * @param  array<string, string>  $files
 */
function fakeSvgMushafSource(array $files): void
{
    Http::fake(function (Request $request) use ($files) {
        $path = Str::after($request->url(), '/'.config('mushaf.commit').'/');

        return array_key_exists($path, $files)
            ? Http::response($files[$path], 200)
            : Http::response('', 404);
    });
}

function svgMushafCachePath(string $relative): string
{
    return SourceCache::path('svg-mushaf/'.config('mushaf.commit').'/'.SVG_MUSHAF_FIXTURE_BASE.'/'.$relative);
}

/**
 * @return list<string>
 */
function svgMushafPartialFiles(): array
{
    $root = SourceCache::path('svg-mushaf');

    if (! is_dir($root)) {
        return [];
    }

    return array_values(array_map(
        fn (SplFileInfo $file): string => $file->getPathname(),
        array_filter(iterator_to_array(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root))), fn (SplFileInfo $file): bool => str_ends_with($file->getFilename(), '.part')),
    ));
}

function svgMushafCounts(): array
{
    return [
        'mushafs' => SvgMushaf::query()->count(),
        'pages' => SvgMushafPage::query()->count(),
        'regions' => SvgMushafAyahRegion::query()->count(),
    ];
}

it('computes the git blob SHA-1 of a string', function (): void {
    expect(SvgMushafDownloader::blobSha("hello\n"))->toBe('ce013625030ba8dba906f756967f9e9ca394464a');
});

it('refuses a page with one changed byte and writes nothing to the cache or the database', function (): void {
    $files = svgMushafFixtureFiles();
    installSvgMushafManifest($files);

    $tampered = $files[SVG_MUSHAF_FIXTURE_BASE.'/svg/001.svg'];
    $tampered[10] = chr(ord($tampered[10]) ^ 1);
    fakeSvgMushafSource([...$files, SVG_MUSHAF_FIXTURE_BASE.'/svg/001.svg' => $tampered]);

    expect(fn () => app(SvgMushafImporter::class)->import('warsh', false))
        ->toThrow(SvgMushafSourceException::class, 'pinned size and blob SHA');

    expect(File::exists(svgMushafCachePath('svg/001.svg')))->toBeFalse()
        ->and(svgMushafPartialFiles())->toBe([])
        ->and(svgMushafCounts())->toBe(['mushafs' => 0, 'pages' => 0, 'regions' => 0]);
});

it('refuses a page the source does not serve', function (): void {
    $files = svgMushafFixtureFiles();
    installSvgMushafManifest($files);
    unset($files[SVG_MUSHAF_FIXTURE_BASE.'/svg/002.svg']);
    fakeSvgMushafSource($files);

    expect(fn () => app(SvgMushafImporter::class)->import('warsh', false))
        ->toThrow(SvgMushafSourceException::class, 'HTTP 404');

    expect(svgMushafCounts())->toBe(['mushafs' => 0, 'pages' => 0, 'regions' => 0]);
});

it('refuses a page set that is missing one ayah and names the surah', function (): void {
    $files = svgMushafFixtureFiles(missingAyah: true);
    installSvgMushafManifest($files);
    fakeSvgMushafSource($files);

    expect(fn () => app(SvgMushafImporter::class)->import('warsh', false))
        ->toThrow(SvgMushafCheckException::class, 'surah 2: found 2, expected 3');

    expect(svgMushafCounts())->toBe(['mushafs' => 0, 'pages' => 0, 'regions' => 0]);
});

it('imports a good fixture: row counts, ayah count, gzip beside each page, and its digest', function (): void {
    $files = svgMushafFixtureFiles();
    installSvgMushafManifest($files);
    fakeSvgMushafSource($files);

    $this->artisan('mushaf:import', ['key' => 'warsh'])
        ->expectsOutputToContain('2 pages, 6 ayah regions, 5 ayahs')
        ->assertSuccessful();

    $mushaf = SvgMushaf::query()->where('key', 'warsh')->sole();

    expect($mushaf->folder)->toBe('warsh')
        ->and($mushaf->edition_year)->toBe(1442)
        ->and($mushaf->page_count)->toBe(2)
        ->and($mushaf->ayah_count)->toBe(5)
        ->and($mushaf->source_commit)->toBe(config('mushaf.commit'))
        ->and(SvgMushafPage::query()->where('svg_mushaf_id', $mushaf->id)->count())->toBe(2)
        ->and(SvgMushafAyahRegion::query()->where('svg_mushaf_id', $mushaf->id)->count())->toBe(6);

    // Ayah 2 of surah 2 spans both pages, so it has one region on each.
    expect(SvgMushafAyahRegion::query()->where('surah', 2)->where('ayah', 2)->pluck('page')->all())->toBe([1, 2]);

    $polygon = SvgMushafAyahRegion::query()->where('page', 1)->where('surah', 1)->where('ayah', 1)->sole()->polygon;
    expect($polygon)->toBe(SVG_MUSHAF_FIXTURE_POLYGON);

    $gzip = svgMushafCachePath('svg/001.svg.gz');
    $page1 = SvgMushafPage::query()->where('svg_mushaf_id', $mushaf->id)->where('page', 1)->sole();

    expect(File::exists($gzip))->toBeTrue()
        ->and($page1->gz_sha256)->toBe(hash_file('sha256', $gzip))
        ->and($page1->gz_bytes)->toBe(filesize($gzip))
        ->and(gzdecode(File::get($gzip)))->toBe($files[SVG_MUSHAF_FIXTURE_BASE.'/svg/001.svg'])
        ->and($page1->svg_blob_sha)->toBe(svgMushafFixtureBlobSha($files[SVG_MUSHAF_FIXTURE_BASE.'/svg/001.svg']));
});

it('records the TQP1 container digest and size of each page', function (): void {
    $files = svgMushafFixtureFiles();
    installSvgMushafManifest($files);
    fakeSvgMushafSource($files);

    app(SvgMushafImporter::class)->import('warsh', false);

    foreach ([1, 2] as $page) {
        $container = (new TqpEncoder)->container($files[SVG_MUSHAF_FIXTURE_BASE.'/svg/00'.$page.'.svg']);
        $row = SvgMushafPage::query()->where('page', $page)->sole();

        expect($row->tqp_sha256)->toBe(hash('sha256', $container))
            ->and($row->tqp_bytes)->toBe(strlen($container));
    }
});

it('refuses a page with an arc, names it, and writes nothing, not even the gzip of an earlier page', function (): void {
    $files = svgMushafFixtureFiles();
    $files[SVG_MUSHAF_FIXTURE_BASE.'/svg/002.svg'] = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 345 550"><!-- FIXTURE page 2 — not artwork -->'
        .'<g transform="translate(0 0)"><g id="content"><path d="M 0 0 A 1 1 0 0 1 5 5"/></g></g></svg>';
    installSvgMushafManifest($files);
    fakeSvgMushafSource($files);

    expect(fn () => app(SvgMushafImporter::class)->import('warsh', false))
        ->toThrow(SvgMushafCheckException::class, 'Page 2: The path has an arc');

    expect(File::exists(svgMushafCachePath('svg/001.svg.gz')))->toBeFalse()
        ->and(svgMushafCounts())->toBe(['mushafs' => 0, 'pages' => 0, 'regions' => 0]);
});

it('imports a continuation entry without a label point and counts its ayah once', function (): void {
    $files = svgMushafFixtureFiles(runOn: ['x' => null, 'y' => null, 'continuation' => true]);
    installSvgMushafManifest($files);
    fakeSvgMushafSource($files);

    $report = app(SvgMushafImporter::class)->import('warsh', false);
    $runOn = SvgMushafAyahRegion::query()->where('page', 2)->where('surah', 2)->where('ayah', 2)->sole();

    expect($report->ayahs)->toBe(5)
        ->and($report->regions)->toBe(6)
        ->and($runOn->label_x)->toBeNull()
        ->and($runOn->label_y)->toBeNull();
});

it('refuses an entry without a label point that is not a continuation', function (array $runOn): void {
    $files = svgMushafFixtureFiles(runOn: $runOn);
    installSvgMushafManifest($files);
    fakeSvgMushafSource($files);

    expect(fn () => app(SvgMushafImporter::class)->import('warsh', false))
        ->toThrow(SvgMushafSourceException::class, 'Page 2 has a malformed ayah entry.');

    expect(svgMushafCounts())->toBe(['mushafs' => 0, 'pages' => 0, 'regions' => 0]);
})->with([
    'no continuation flag' => [['x' => null, 'y' => null]],
    'continuation not true' => [['x' => null, 'y' => null, 'continuation' => 'yes']],
    'only one coordinate' => [['x' => null, 'continuation' => true]],
]);

it('replaces the rows on a re-import with no duplicates', function (): void {
    $files = svgMushafFixtureFiles();
    installSvgMushafManifest($files);
    fakeSvgMushafSource($files);

    app(SvgMushafImporter::class)->import('warsh', false);
    $first = svgMushafCounts();

    app(SvgMushafImporter::class)->import('warsh', false);

    expect(svgMushafCounts())->toBe($first)
        ->and($first)->toBe(['mushafs' => 1, 'pages' => 2, 'regions' => 6]);
});

it('fails offline with an empty cache, clearly, and sends no request', function (): void {
    $files = svgMushafFixtureFiles();
    installSvgMushafManifest($files);
    fakeSvgMushafSource($files);

    $this->artisan('mushaf:import', ['key' => 'warsh', '--offline' => true])
        ->expectsOutputToContain('No verified cached copy')
        ->assertFailed();

    Http::assertNothingSent();
    expect(svgMushafCounts())->toBe(['mushafs' => 0, 'pages' => 0, 'regions' => 0]);
});

it('fails for an unknown key', function (): void {
    expect(fn () => app(SvgMushafImporter::class)->import('nope', false))
        ->toThrow(UnknownSvgMushafException::class, 'Unknown mushaf [nope]');

    $this->artisan('mushaf:import', ['key' => 'nope'])
        ->expectsOutputToContain('Unknown mushaf')
        ->assertFailed();
});
