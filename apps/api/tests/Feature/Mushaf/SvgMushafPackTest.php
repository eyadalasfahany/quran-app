<?php

declare(strict_types=1);

use App\Domains\Content\Jobs\BuildContentPackJob;
use App\Domains\Content\Models\ContentPack;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Packs\PackBuildException;
use App\Domains\Mushaf\Enums\WordBoxesStatus;
use App\Domains\Mushaf\Exceptions\SvgMushafException;
use App\Domains\Mushaf\Models\SvgMushaf;
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
    $pages = $pdo->query('SELECT page, svgz FROM pages ORDER BY page')->fetchAll(PDO::FETCH_ASSOC);
    $store = app(SvgMushafStore::class);

    expect($pages)->toHaveCount(2);

    foreach ($pages as $row) {
        $expected = $store->read(svgPackFixtureBase('warsh'), sprintf('svg/%03d.svg.gz', $row['page']));
        expect((string) $row['svgz'])->toBe($expected);
    }

    expect($pdo->query('SELECT page, surah, ayah, label_x, label_y, polygon FROM regions ORDER BY page, surah, ayah')->fetchAll(PDO::FETCH_ASSOC))
        ->toBe([
            ['page' => 1, 'surah' => 1, 'ayah' => 1, 'label_x' => 10.5, 'label_y' => 20.25, 'polygon' => 'M 0 0 L 1 0 L 1 1 L 0 1 Z'],
            ['page' => 1, 'surah' => 1, 'ayah' => 2, 'label_x' => 30.5, 'label_y' => 40.25, 'polygon' => 'M 0 0 L 1 0 L 1 1 L 0 1 Z'],
            ['page' => 2, 'surah' => 1, 'ayah' => 2, 'label_x' => null, 'label_y' => null, 'polygon' => 'M 0 0 L 1 0 L 1 1 L 0 1 Z'],
        ])
        ->and($pdo->query('SELECT COUNT(*) FROM word_boxes')->fetchColumn())->toBe(0);

    expect(svgPackMeta($pdo))->toMatchArray([
        'pack_schema_version' => '1',
        'group' => 'svg_mushafs',
        'mushaf_key' => 'warsh',
        'page_count' => '2',
        'has_word_boxes' => '0',
        'resource_id' => (string) $resource->id,
        'version' => '1',
    ])->and(svgPackMeta($pdo))->not->toHaveKey('word_boxes_digest');
});

it('refuses a page that is missing, has the wrong size or the wrong digest, and leaves no pack', function (string $problem): void {
    $mushaf = svgPackSeedEdition('warsh');
    $page = DB::table('svg_mushaf_pages')->where('svg_mushaf_id', $mushaf->id)->where('page', 2);

    match ($problem) {
        'missing' => app(SvgMushafStore::class)->delete(svgPackFixtureBase('warsh'), 'svg/002.svg.gz'),
        'wrong size' => $page->update(['gz_bytes' => 1]),
        'wrong digest' => $page->update(['gz_sha256' => str_repeat('0', 64)]),
    };

    expect(fn () => svgPackPublish('warsh'))->toThrow(PackBuildException::class, 'Page 2 of the SVG mushaf is missing or changed');

    expect(ContentPack::query()->count())->toBe(0)
        ->and(Storage::disk('local')->allFiles('packs'))->toBe([]);
})->with(['missing', 'wrong size', 'wrong digest']);

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

    DB::table('svg_mushaf_pages')->where('svg_mushaf_id', $mushaf->id)->where('page', 1)->update(['gz_sha256' => str_repeat('1', 64)]);

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
