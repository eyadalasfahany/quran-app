<?php

declare(strict_types=1);

use App\Domains\Content\Enums\PermissionStatus;
use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Models\ContentPack;
use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Packs\PackBuilder;
use App\Domains\Content\Packs\PackBuildException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Http::preventStrayRequests();
    Storage::fake('local');
});

/**
 * @return array<string, mixed>
 */
function sourceResourceAttributes(PermissionStatus $status, ResourceGroup $group): array
{
    $source = ContentSource::query()->create([
        'code' => 'gate-'.$status->value.'-'.$group->value,
        'name' => 'Gate test',
        'licence_url' => 'https://example.com/licence',
        'attribution_ar' => 'إسناد',
        'attribution_en' => 'Attribution',
        'permission_status' => $status,
    ]);

    return ['source_id' => $source->id, 'group' => $group, 'version' => 1];
}

it('refuses to build a pack for a source whose rights are not cleared', function (PermissionStatus $status): void {
    $resource = Resource::factory()->create(sourceResourceAttributes($status, ResourceGroup::Azkar));

    expect(fn () => app(PackBuilder::class)->build($resource))->toThrow(PackBuildException::class)
        ->and(ContentPack::query()->where('resource_id', $resource->id)->count())->toBe(0)
        ->and(Storage::disk('local')->allFiles())->toBe([]);
})->with([
    'pending' => [PermissionStatus::Pending],
    'denied' => [PermissionStatus::Denied],
]);

it('builds a pack for a granted or not-required source', function (PermissionStatus $status): void {
    $resource = Resource::factory()->create(sourceResourceAttributes($status, ResourceGroup::Azkar));

    $pack = app(PackBuilder::class)->build($resource);

    expect($pack->rowCount)->toBe(0)
        ->and(Storage::disk('local')->exists($pack->path))->toBeTrue();
})->with([
    'granted' => [PermissionStatus::Granted],
    'not required' => [PermissionStatus::NotRequired],
]);

it('packs an azkar chapter row through the azkar snapshot queries', function (): void {
    $resource = Resource::factory()->create(sourceResourceAttributes(PermissionStatus::Granted, ResourceGroup::Azkar));
    DB::table('azkar_chapters')->insert([
        'resource_id' => $resource->id,
        'id' => 1,
        'source_chapter_id' => 'chapter-1',
        'number' => 1,
        'title_ar' => null,
        'title_en' => null,
    ]);

    $pack = app(PackBuilder::class)->build($resource);

    expect($pack->rowCount)->toBe(1);
});

it('omits a pending source from the manifest and from its pack and change endpoints', function (): void {
    $pending = Resource::factory()->create(sourceResourceAttributes(PermissionStatus::Pending, ResourceGroup::Azkar));
    $granted = Resource::factory()->create(sourceResourceAttributes(PermissionStatus::Granted, ResourceGroup::Azkar));
    app(PackBuilder::class)->build($granted);

    // A pack recorded before the source was downgraded must still stay out of the manifest.
    ContentPack::query()->create([
        'resource_id' => $pending->id,
        'version' => 1,
        'path' => 'packs/'.$pending->id.'/1.sqlite.gz',
        'size_bytes' => 10,
        'sha256' => str_repeat('a', 64),
        'row_count' => 0,
        'schema_version' => 1,
        'built_at' => now(),
    ]);

    $this->withHeaders(['Accept' => 'application/json', 'Accept-Language' => 'en']);

    $response = $this->getJson('/api/v1/content/manifest')->assertOk();
    $ids = collect($response->json('resources'))->pluck('id')->all();

    expect($ids)->toContain($granted->id)
        ->and($ids)->not->toContain($pending->id);

    $this->getJson('/api/v1/content/packs/'.$pending->id.'/1')->assertNotFound();
});
