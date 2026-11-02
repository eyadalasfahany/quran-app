<?php

declare(strict_types=1);

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Models\ContentPack;
use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Resource;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

/*
| ADR 0031 §12: only the azkar resource of config azkar.primary_source is listed and served. A non-primary azkar resource
| stays imported for comparison, but the manifest, the change feed and the pack endpoint never show it.
*/

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Storage::fake('local');
    ContentSource::query()->whereIn('code', ['opendua', 'hisnmuslim'])->update(['permission_status' => 'granted']);

    $this->withHeaders(['Accept' => 'application/json', 'Accept-Language' => 'en']);
});

/**
 * An azkar resource from the given source, with a recorded pack so the manifest would list it.
 */
function apsResource(string $code): Resource
{
    $source = ContentSource::query()->where('code', $code)->firstOrFail();
    $resource = Resource::factory()->create([
        'source_id' => $source->id,
        'group' => ResourceGroup::Azkar,
        'version' => 1,
    ]);

    Storage::disk('local')->put('packs/'.$resource->id.'/1.sqlite.gz', 'FIXTURE pack bytes');

    ContentPack::query()->create([
        'resource_id' => $resource->id,
        'version' => 1,
        'path' => 'packs/'.$resource->id.'/1.sqlite.gz',
        'size_bytes' => 10,
        'sha256' => str_repeat('b', 64),
        'row_count' => 0,
        'schema_version' => 1,
        'built_at' => now(),
    ]);

    return $resource;
}

/**
 * @return list<int>
 */
function apsListedIds(): array
{
    return collect(test()->getJson('/api/v1/content/manifest')->assertOk()->json('resources'))->pluck('id')->map(fn ($id): int => (int) $id)->all();
}

it('lists and serves the primary source only, and the default primary is opendua', function (): void {
    $opendua = apsResource('opendua');
    $hisnmuslim = apsResource('hisnmuslim');

    expect(config('azkar.primary_source', 'opendua'))->toBe('opendua');

    $ids = apsListedIds();

    expect($ids)->toContain($opendua->id)
        ->and($ids)->not->toContain($hisnmuslim->id);

    $this->getJson('/api/v1/content/packs/'.$hisnmuslim->id.'/1')->assertNotFound();
});

it('switching the primary source flips which azkar resource is listed', function (): void {
    $opendua = apsResource('opendua');
    $hisnmuslim = apsResource('hisnmuslim');

    config(['azkar.primary_source' => 'hisnmuslim']);

    $ids = apsListedIds();

    expect($ids)->toContain($hisnmuslim->id)
        ->and($ids)->not->toContain($opendua->id);
});

it('a non-primary azkar resource is hidden from the change feed as well', function (): void {
    $hisnmuslim = apsResource('hisnmuslim');

    $this->getJson('/api/v1/content/changes?resource_id='.$hisnmuslim->id.'&since_version=0')->assertNotFound();
});
