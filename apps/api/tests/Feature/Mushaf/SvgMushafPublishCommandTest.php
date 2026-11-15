<?php

declare(strict_types=1);

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Jobs\BuildContentPackJob;
use App\Domains\Content\Models\ContentPack;
use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Resource;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
