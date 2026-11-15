<?php

declare(strict_types=1);

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Models\ContentPack;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Packs\PackBuilder;
use App\Domains\Mushaf\Services\SvgMushafPublisher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

// Synthetic fixtures only (tests/Support/SvgMushafPackFixtures.php).

require_once __DIR__.'/../../Support/SvgMushafPackFixtures.php';

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Storage::fake('local');
    svgPackFixtureTearDown();
    $this->withHeaders(['Accept' => 'application/json', 'Accept-Language' => 'en']);
});

afterEach(function (): void {
    svgPackFixtureTearDown();
});

it('lists the svg mushaf in the manifest with its flag, size and pack url', function (): void {
    svgPackSeedEdition('warsh');
    $resource = app(SvgMushafPublisher::class)->publish('warsh', false, false);
    $pack = ContentPack::query()->where('resource_id', $resource->id)->firstOrFail();

    $entry = collect($this->getJson('/api/v1/content/manifest')->assertOk()->json('resources'))
        ->firstWhere('group', 'svg_mushafs');

    expect($entry)->toMatchArray([
        'id' => $resource->id,
        'group' => 'svg_mushafs',
        'key' => 'warsh',
        'version' => 1,
        'has_word_boxes' => false,
        'pack' => [
            'url' => '/api/v1/content/packs/'.$resource->id.'/1',
            'size_bytes' => Storage::disk('local')->size($pack->path),
            'sha256' => $pack->sha256,
        ],
    ]);
});

it('serves a seeded svg mushaf pack as application/vnd.sqlite3, with an etag and a range', function (): void {
    svgPackSeedEdition('warsh');
    $resource = app(SvgMushafPublisher::class)->publish('warsh', false, false);
    $pack = ContentPack::query()->where('resource_id', $resource->id)->firstOrFail();

    $this->get('/api/v1/content/packs/'.$resource->id.'/1')
        ->assertOk()
        ->assertHeader('Content-Type', 'application/vnd.sqlite3')
        ->assertHeader('ETag', '"'.$pack->sha256.'"');

    $this->get('/api/v1/content/packs/'.$resource->id.'/1', ['Range' => 'bytes=0-15'])
        ->assertStatus(206);
});

it('keeps application/gzip for a gzip pack of another group', function (): void {
    $tafsir = Resource::factory()->create([
        'group' => ResourceGroup::Tafsirs,
        'version' => 2,
        'is_active' => true,
    ]);
    app(PackBuilder::class)->build($tafsir);

    $this->get('/api/v1/content/packs/'.$tafsir->id.'/2')
        ->assertOk()
        ->assertHeader('Content-Type', 'application/gzip');
});

it('answers 404 for an inactive svg mushaf', function (): void {
    svgPackSeedEdition('warsh');
    $resource = app(SvgMushafPublisher::class)->publish('warsh', false, false);
    $resource->is_active = false;
    $resource->save();

    $this->getJson('/api/v1/content/packs/'.$resource->id.'/1')
        ->assertNotFound()
        ->assertJsonPath('detail', 'The content pack was not found.');
});
