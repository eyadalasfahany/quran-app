<?php

declare(strict_types=1);

use App\Domains\Content\Jobs\BuildContentPackJob;
use App\Domains\Content\Models\ContentPack;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Packs\PackBuildException;
use App\Domains\Mushaf\Enums\WordBoxesStatus;
use App\Domains\Mushaf\Exceptions\SvgMushafException;
use App\Domains\Mushaf\Models\SvgMushaf;
use App\Domains\Mushaf\Packs\Tqp\TqpPageBlob;
use App\Domains\Mushaf\Services\SvgMushafPublisher;
use App\Domains\Mushaf\Services\WordBoxApproval;
use App\Domains\Mushaf\Sources\SvgMushafStore;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

// Synthetic fixtures only (tests/Support/SvgMushafPackFixtures.php): placeholder page bytes, a unit polygon and plain numbers.

require_once __DIR__.'/../../Support/SvgMushafPackFixtures.php';

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Storage::fake('local');
    svgPackFixtureTearDown();
});

afterEach(function (): void {
    svgPackFixtureTearDown();
});

/**
 * Opens a stored pack for reading in the test.
 */
function svgPackOpen(ContentPack $pack): PDO
{
    return new PDO('sqlite:'.Storage::disk('local')->path($pack->path), options: [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
}

/**
 * @return array<string, string>
 */
function svgPackMeta(PDO $pdo): array
{
    $meta = [];

    foreach ($pdo->query('SELECT key, value FROM meta')->fetchAll(PDO::FETCH_NUM) as [$key, $value]) {
        $meta[(string) $key] = (string) $value;
    }

    return $meta;
}

function svgPackPublish(string $key, bool $deferPack = false, bool $withoutWordBoxes = false): Resource
{
    return app(SvgMushafPublisher::class)->publish($key, $deferPack, $withoutWordBoxes);
}

it('builds an uncompressed pack of pages and regions, with no word boxes, for a non-Hafs edition', function (): void {
    $mushaf = svgPackSeedEdition('warsh');
    DB::table('svg_mushaf_word_boxes')->insert([
        'svg_mushaf_id' => $mushaf->id, 'page' => 1, 'line' => 1, 'surah' => 1, 'ayah' => 1, 'position' => 1,
        'x0' => '1', 'y0' => '1', 'x1' => '2', 'y1' => '2', 'created_at' => now(), 'updated_at' => now(),
    ]);

    $resource = svgPackPublish('warsh');
    $pack = ContentPack::query()->where('resource_id', $resource->id)->firstOrFail();

    expect($resource->version)->toBe(1)
        ->and($pack->path)->toEndWith('.sqlite')
        ->and($pack->has_word_boxes)->toBeFalse();

    $bytes = Storage::disk('local')->get($pack->path);
    expect(substr((string) $bytes, 0, 2))->not->toBe("\x1f\x8b")
        ->and($pack->sha256)->toBe(hash('sha256', (string) $bytes))
        ->and($pack->size_bytes)->toBe(strlen((string) $bytes));

    $pdo = svgPackOpen($pack);
    $pages = $pdo->query('SELECT page, tqp FROM pages ORDER BY page')->fetchAll(PDO::FETCH_ASSOC);
    $tqpRows = DB::table('svg_mushaf_pages')->where('svg_mushaf_id', $mushaf->id)->orderBy('page')->get();

    expect($pages)->toHaveCount(2);

    foreach ($pages as $index => $row) {
        $blob = (string) $row['tqp'];
        $container = substr($blob, 0, 18).gzinflate(substr($blob, 18));

        expect(substr($blob, 0, 4))->toBe('TQP1')
            ->and(hash('sha256', $container))->toBe($tqpRows[$index]->tqp_sha256)
            ->and($blob)->toBe(TqpPageBlob::build(svgPackFixtureSvg('warsh', (int) $row['page']))['blob']);
    }

    expect($pdo->query('SELECT page, surah, ayah, label_x, label_y, polygon FROM regions ORDER BY page, surah, ayah')->fetchAll(PDO::FETCH_ASSOC))
        ->toBe([
            ['page' => 1, 'surah' => 1, 'ayah' => 1, 'label_x' => 10.5, 'label_y' => 20.25, 'polygon' => 'M 0 0 L 1 0 L 1 1 L 0 1 Z'],
            ['page' => 1, 'surah' => 1, 'ayah' => 2, 'label_x' => 30.5, 'label_y' => 40.25, 'polygon' => 'M 0 0 L 1 0 L 1 1 L 0 1 Z'],
            ['page' => 2, 'surah' => 1, 'ayah' => 2, 'label_x' => null, 'label_y' => null, 'polygon' => 'M 0 0 L 1 0 L 1 1 L 0 1 Z'],
        ])
        ->and($pdo->query('SELECT COUNT(*) FROM word_boxes')->fetchColumn())->toBe(0);

    expect($pack->schema_version)->toBe(2)
        ->and($pdo->query('SELECT origin_x, origin_y FROM pages WHERE page = 1')->fetch(PDO::FETCH_NUM))->toBe([0.0, 0.0])
        ->and($pdo->query('SELECT origin_x, origin_y FROM pages WHERE page = 2')->fetch(PDO::FETCH_NUM))->toBe([-10.5, -20.25])
        ->and(array_column($pdo->query('PRAGMA table_info(pages)')->fetchAll(PDO::FETCH_ASSOC), 'name'))->toBe(['page', 'tqp', 'origin_x', 'origin_y']);
    expect(svgPackMeta($pdo))->toMatchArray([
        'pack_schema_version' => '2',
        'page_format' => 'tqp1-deflate-n32',
        'group' => 'svg_mushafs',
        'mushaf_key' => 'warsh',
        'page_count' => '2',
        'has_word_boxes' => '0',
        'resource_id' => (string) $resource->id,
        'version' => '1',
    ])->and(svgPackMeta($pdo))->not->toHaveKey('word_boxes_digest');
});

it('refuses a page whose raw SVG is missing or changed, or whose encoding differs from the import, and leaves no pack', function (string $problem, string $message): void {
    $mushaf = svgPackSeedEdition('warsh');
    $store = app(SvgMushafStore::class);

    match ($problem) {
        'missing' => $store->delete(svgPackFixtureBase('warsh'), 'svg/002.svg'),
        'changed file' => $store->write(svgPackFixtureBase('warsh'), 'svg/002.svg', svgPackFixtureSvg('warsh', 2).'<!-- changed -->'),
        'wrong digest' => DB::table('svg_mushaf_pages')->where('svg_mushaf_id', $mushaf->id)->where('page', 2)->update(['tqp_sha256' => str_repeat('0', 64)]),
    };

    expect(fn () => svgPackPublish('warsh'))->toThrow(PackBuildException::class, $message);

    expect(ContentPack::query()->count())->toBe(0)
        ->and(Storage::disk('local')->allFiles('packs'))->toBe([]);
})->with([
    'missing' => ['missing', 'Page 2 of the SVG mushaf is missing or changed'],
    'changed file' => ['changed file', 'Page 2 of the SVG mushaf is missing or changed'],
    'wrong digest' => ['wrong digest', 'Page 2: the encoded page changed since import. Run mushaf:import.'],
]);

it('writes Hafs word boxes only when every approval check holds', function (string $variant): void {
    $mushaf = svgPackSeedEdition('hafs');
    $digest = hash('sha256', 'FIXTURE word-box digest');
    svgPackApproveHafs($mushaf, $digest);

    $mushaf->forceFill([
        'word_boxes_status' => $variant === 'failed status' ? WordBoxesStatus::Failed : WordBoxesStatus::Approved,
    ])->save();
    config(['mushaf.approved_word_boxes.hafs' => match ($variant) {
        'config pin differs' => hash('sha256', 'FIXTURE other pin'),
        'no config pin' => null,
        default => $digest,
    }]);
    File::put(resource_path('svg-mushaf/test-pack'.svgPackFixtureSuffix().'-boxes-hafs.json'), json_encode([
        'digest' => $variant === 'file digest differs' ? hash('sha256', 'FIXTURE other digest') : $digest,
    ], JSON_THROW_ON_ERROR));

    $resource = svgPackPublish('hafs', withoutWordBoxes: true);
    $pack = ContentPack::query()->where('resource_id', $resource->id)->firstOrFail();
    $pdo = svgPackOpen($pack);

    expect($pack->has_word_boxes)->toBeFalse()
        ->and($pdo->query('SELECT COUNT(*) FROM word_boxes')->fetchColumn())->toBe(0)
        ->and(svgPackMeta($pdo))->toMatchArray(['has_word_boxes' => '0'])
        ->and(svgPackMeta($pdo))->not->toHaveKey('word_boxes_digest');
})->with(['config pin differs', 'no config pin', 'failed status', 'file digest differs']);

it('writes the approved Hafs word boxes with real coordinates and records the digest', function (): void {
    $mushaf = svgPackSeedEdition('hafs');
    $digest = hash('sha256', 'FIXTURE word-box digest');
    svgPackApproveHafs($mushaf, $digest);

    $resource = svgPackPublish('hafs');
    $pack = ContentPack::query()->where('resource_id', $resource->id)->firstOrFail();
    $pdo = svgPackOpen($pack);

    expect($pack->has_word_boxes)->toBeTrue()
        ->and($pdo->query('SELECT COUNT(*) FROM word_boxes')->fetchColumn())->toBe(2)
        ->and($pdo->query('SELECT typeof(x0) FROM word_boxes LIMIT 1')->fetchColumn())->toBe('real')
        ->and(svgPackMeta($pdo))->toMatchArray(['has_word_boxes' => '1', 'word_boxes_digest' => $digest]);
});

it('does not bump an unchanged edition, and bumps it on a page change or an approval change', function (): void {
    Queue::fake();
    $mushaf = svgPackSeedEdition('warsh');

    expect(svgPackPublish('warsh')->version)->toBe(1)
        ->and(svgPackPublish('warsh')->version)->toBe(1)
        ->and(ContentPack::query()->count())->toBe(1);

    DB::table('svg_mushaf_pages')->where('svg_mushaf_id', $mushaf->id)->where('page', 1)->update(['tqp_sha256' => str_repeat('1', 64)]);

    expect(svgPackPublish('warsh', deferPack: true)->version)->toBe(2);
    Queue::assertPushed(BuildContentPackJob::class, 1);

    $hafs = svgPackSeedEdition('hafs');
    expect(svgPackPublish('hafs', withoutWordBoxes: true)->version)->toBe(1);

    svgPackApproveHafs($hafs, hash('sha256', 'FIXTURE word-box digest'));

    expect(svgPackPublish('hafs', deferPack: true)->version)->toBe(2);
});

it('refuses an edition that is not imported or has the wrong page count', function (): void {
    expect(fn () => svgPackPublish('warsh'))->toThrow(SvgMushafException::class, 'is not imported');

    svgPackSeedEdition('warsh', pages: 3);
    config(['mushaf.pages' => 604]);

    expect(fn () => svgPackPublish('warsh'))->toThrow(SvgMushafException::class, 'pages, not 604');
});

it('never reads a missing committed file as an approval', function (): void {
    $mushaf = svgPackSeedEdition('hafs');
    svgPackApproveHafs($mushaf, hash('sha256', 'FIXTURE word-box digest'));
    File::delete(resource_path('svg-mushaf/test-pack'.svgPackFixtureSuffix().'-boxes-hafs.json'));

    expect(WordBoxApproval::isApproved(SvgMushaf::query()->findOrFail($mushaf->id)))->toBeFalse();
});

it('writes the contour rows only when the map is approved, and never changes the word-box digest', function (): void {
    $mushaf = svgPackSeedEdition('hafs');
    $boxDigest = hash('sha256', 'FIXTURE word-box digest');
    svgPackApproveHafs($mushaf, $boxDigest);
    $contourDigest = hash('sha256', 'FIXTURE contour digest');
    svgPackSeedContours($mushaf, 'pending_review', $contourDigest);

    $pending = svgPackOpen(ContentPack::query()->where('resource_id', svgPackPublish('hafs')->id)->firstOrFail());

    expect(svgPackMeta($pending))->toMatchArray(['has_word_contours' => '0', 'word_boxes_digest' => $boxDigest])
        ->and(svgPackMeta($pending))->not->toHaveKey('word_contours_digest')
        ->and($pending->query('SELECT COUNT(*) FROM word_contours')->fetchColumn())->toBe(0)
        ->and($pending->query('SELECT COUNT(*) FROM contour_blocks')->fetchColumn())->toBe(0);

    svgPackApproveContours($mushaf, $contourDigest);
    $resource = svgPackPublish('hafs');
    $approved = svgPackOpen(ContentPack::query()->where('resource_id', $resource->id)->where('version', $resource->version)->firstOrFail());

    expect(svgPackMeta($approved))->toMatchArray([
        'has_word_contours' => '1', 'word_boxes_digest' => $boxDigest, 'word_contours_digest' => $contourDigest,
    ])
        ->and($approved->query('SELECT COUNT(*) FROM word_contours')->fetchColumn())->toBe(1)
        ->and($approved->query('SELECT typeof(x0) FROM contour_blocks LIMIT 1')->fetchColumn())->toBe('integer')
        ->and($approved->query('SELECT x1 FROM contour_blocks LIMIT 1')->fetchColumn())->toBe(320);
});

it('creates the contour tables in every pack, even one with no word boxes', function (): void {
    svgPackSeedEdition('warsh');

    $pdo = svgPackOpen(ContentPack::query()->where('resource_id', svgPackPublish('warsh')->id)->firstOrFail());

    expect($pdo->query("SELECT COUNT(*) FROM sqlite_master WHERE name IN ('word_contours', 'contour_blocks')")->fetchColumn())->toBe(2)
        ->and(svgPackMeta($pdo))->toMatchArray(['has_word_contours' => '0'])
        ->and(svgPackMeta($pdo))->not->toHaveKey('word_contours_digest');
});

it('writes a pending map only with --with-pending-contours, and never a failed one', function (): void {
    $mushaf = svgPackSeedEdition('hafs');
    svgPackApproveHafs($mushaf, hash('sha256', 'FIXTURE word-box digest'));
    $contourDigest = hash('sha256', 'FIXTURE contour digest');
    svgPackSeedContours($mushaf, 'failed', $contourDigest);

    expect(fn () => app(SvgMushafPublisher::class)->publish('hafs', false, false, false, true))
        ->toThrow(SvgMushafException::class, 'A failed map is never published.');
    expect(ContentPack::query()->count())->toBe(0);

    DB::table('svg_mushaf_word_contours')->delete();
    DB::table('svg_mushaf_contour_blocks')->delete();
    svgPackSeedContours($mushaf->refresh(), 'pending_review', $contourDigest);

    $resource = app(SvgMushafPublisher::class)->publish('hafs', false, false, false, true);
    $pdo = svgPackOpen(ContentPack::query()->where('resource_id', $resource->id)->firstOrFail());

    expect(svgPackMeta($pdo))->toMatchArray(['has_word_contours' => '1', 'word_contours_digest' => $contourDigest])
        ->and($pdo->query('SELECT COUNT(*) FROM word_contours')->fetchColumn())->toBe(1);
});
