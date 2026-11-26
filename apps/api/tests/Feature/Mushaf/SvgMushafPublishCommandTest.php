<?php

declare(strict_types=1);

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Jobs\BuildContentPackJob;
use App\Domains\Content\Models\ContentPack;
use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Resource;
use App\Domains\Mushaf\Packs\SvgMushafPackBuilder;
use App\Domains\Mushaf\Services\SvgMushafPublisher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

// Synthetic fixtures only (tests/Support/SvgMushafPackFixtures.php).

require_once __DIR__.'/../../Support/SvgMushafPackFixtures.php';

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Storage::fake('local');
    svgPackFixtureTearDown();
});

afterEach(function (): void {
    svgPackFixtureTearDown();
});

it('refuses Hafs while its word boxes are not approved, and names the way out', function (): void {
    svgPackSeedEdition('hafs');

    $this->artisan('mushaf:publish', ['key' => 'hafs'])
        ->expectsOutputToContain('Hafs is not published until its word boxes are approved. Pass --without-word-boxes')
        ->assertExitCode(1);

    expect(Resource::query()->where('group', ResourceGroup::SvgMushafs)->count())->toBe(0);
});

it('publishes Hafs pages and regions with --without-word-boxes', function (): void {
    svgPackSeedEdition('hafs');

    $this->artisan('mushaf:publish', ['key' => 'hafs', '--without-word-boxes' => true])
        ->expectsOutputToContain('has_word_boxes: no')
        ->assertExitCode(0);

    $pack = ContentPack::query()->firstOrFail();
    expect($pack->has_word_boxes)->toBeFalse();
});

it('refuses --without-word-boxes in production', function (): void {
    svgPackSeedEdition('hafs');
    app()['env'] = 'production';

    $this->artisan('mushaf:publish', ['key' => 'hafs', '--without-word-boxes' => true])
        ->expectsOutputToContain('refused in production')
        ->assertExitCode(1);

    expect(ContentPack::query()->count())->toBe(0);
});

it('fails for a key that is not a configured riwayah', function (): void {
    $this->artisan('mushaf:publish', ['key' => 'nope'])
        ->expectsOutputToContain('Unknown mushaf [nope]')
        ->assertExitCode(1);
});

it('creates the quran_ws resource with the riwayah names', function (): void {
    svgPackSeedEdition('warsh');

    $this->artisan('mushaf:publish', ['key' => 'warsh'])->assertExitCode(0);

    $resource = Resource::query()->where('group', ResourceGroup::SvgMushafs)->firstOrFail();
    $source = ContentSource::query()->where('code', 'quran_ws')->firstOrFail();

    expect($resource->source_id)->toBe($source->id)
        ->and($resource->source_key)->toBe('warsh')
        ->and($resource->name)->toBe('Warsh from Nafi')
        ->and($resource->name_ar)->toBe('ورش عن نافع')
        ->and($resource->version)->toBe(1)
        ->and($source->permission_status->value)->toBe('not_required');
});

it('builds nothing and queues the pack with --defer-pack', function (): void {
    Queue::fake();
    svgPackSeedEdition('warsh');

    $this->artisan('mushaf:publish', ['key' => 'warsh', '--defer-pack' => true])->assertExitCode(0);

    Queue::assertPushed(BuildContentPackJob::class, 1);
    expect(ContentPack::query()->count())->toBe(0);
});

it('refuses to publish page digests from before TQP1 and names the way out', function (): void {
    $mushaf = svgPackSeedEdition('warsh');
    DB::table('svg_mushaf_pages')->where('svg_mushaf_id', $mushaf->id)->update(['tqp_sha256' => null]);

    $this->artisan('mushaf:publish', ['key' => 'warsh'])
        ->expectsOutputToContain('Run mushaf:import again: the page digests are from before TQP1.')
        ->assertExitCode(1);

    expect(ContentPack::query()->count())->toBe(0);
});

it('puts the page format in the publish fingerprint, so a format change bumps the version', function (): void {
    $mushaf = svgPackSeedEdition('warsh');
    $publisher = app(SvgMushafPublisher::class);
    $fingerprint = new ReflectionMethod(SvgMushafPublisher::class, 'fingerprint');

    $resource = $publisher->publish('warsh', false, false);

    expect($resource->import_fingerprint)->toBe($fingerprint->invoke($publisher, $mushaf, false, SvgMushafPackBuilder::FORMAT))
        ->and($fingerprint->invoke($publisher, $mushaf, false, 'tqp1-deflate-n16'))->not->toBe($resource->import_fingerprint);
});

it('refuses the hidden al-Duri edition unless it is forced locally, and never forces it in production', function (): void {
    svgPackSeedEdition('duri');

    $this->artisan('mushaf:publish', ['key' => 'duri', '--without-word-boxes' => true])
        ->expectsOutputToContain('is hidden for now')
        ->assertExitCode(1);

    expect(ContentPack::query()->count())->toBe(0);

    $this->artisan('mushaf:publish', ['key' => 'duri', '--without-word-boxes' => true, '--include-hidden' => true])
        ->assertExitCode(0);

    expect(ContentPack::query()->count())->toBe(1);

    app()['env'] = 'production';

    $this->artisan('mushaf:publish', ['key' => 'duri', '--without-word-boxes' => true, '--include-hidden' => true])
        ->expectsOutputToContain('--include-hidden is for local and test use and is refused in production.')
        ->assertExitCode(1);
});

it('bumps the Hafs version when the contour map is approved, and not when it is republished unchanged', function (): void {
    $mushaf = svgPackSeedEdition('hafs');
    $boxDigest = hash('sha256', 'FIXTURE word-box digest');
    svgPackApproveHafs($mushaf, $boxDigest);
    $contourDigest = hash('sha256', 'FIXTURE contour digest');
    svgPackSeedContours($mushaf, 'pending_review', $contourDigest);

    $publisher = app(SvgMushafPublisher::class);

    expect($publisher->publish('hafs', false, false)->version)->toBe(1)
        ->and($publisher->publish('hafs', false, false)->version)->toBe(1);

    svgPackApproveContours($mushaf->refresh(), $contourDigest);

    expect($publisher->publish('hafs', false, false)->version)->toBe(2)
        ->and($publisher->publish('hafs', false, false)->version)->toBe(2);
});

it('refuses --with-pending-contours in production', function (): void {
    $mushaf = svgPackSeedEdition('hafs');
    svgPackApproveHafs($mushaf, hash('sha256', 'FIXTURE word-box digest'));
    svgPackSeedContours($mushaf, 'pending_review', hash('sha256', 'FIXTURE contour digest'));
    app()['env'] = 'production';

    $this->artisan('mushaf:publish', ['key' => 'hafs', '--with-pending-contours' => true])
        ->expectsOutputToContain('--with-pending-contours is for local and test use and is refused in production.')
        ->assertExitCode(1);

    expect(ContentPack::query()->count())->toBe(0);
});
