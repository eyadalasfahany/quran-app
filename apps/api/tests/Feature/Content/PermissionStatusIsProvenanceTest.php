<?php

declare(strict_types=1);

use App\Domains\Content\Enums\PermissionStatus;
use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Models\ContentPack;
use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Packs\PackBuilder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

/*
| ADR 0045 (2 Nov 2026): content_sources.permission_status is provenance only. It no longer locks a pack build or
| a manifest listing. The primary-source rule (ADR 0031 §12) still decides which azkar resource is served.
*/

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Http::preventStrayRequests();
    Storage::fake('local');
    $this->withHeaders(['Accept' => 'application/json', 'Accept-Language' => 'en']);
});

/**
 * @return array<string, mixed>
 */
function provenanceResourceAttributes(PermissionStatus $status, string $code): array
{
    $source = ContentSource::query()->create([
        'code' => $code,
        'name' => 'Provenance test',
        'licence_url' => 'https://example.com/licence',
        'attribution_ar' => 'إسناد',
        'attribution_en' => 'Attribution',
        'permission_status' => $status,
    ]);

    return ['source_id' => $source->id, 'group' => ResourceGroup::Azkar, 'version' => 1];
}

it('builds an azkar pack from a source whose permission is pending', function (): void {
    $resource = Resource::factory()->create(provenanceResourceAttributes(PermissionStatus::Pending, 'provenance-pending'));
    DB::table('azkar_chapters')->insert([
        'resource_id' => $resource->id,
        'id' => 1,
        'source_chapter_id' => 'chapter-1',
        'number' => 1,
        'title_ar' => null,
        'title_en' => null,
    ]);

    $pack = app(PackBuilder::class)->build($resource);

    expect($pack->rowCount)->toBe(1)
        ->and(ContentPack::query()->where('resource_id', $resource->id)->count())->toBe(1);
});

it('lists the primary azkar source in the manifest whatever its permission status', function (): void {
    $resource = Resource::factory()->create(provenanceResourceAttributes(PermissionStatus::Denied, 'provenance-denied'));
    config(['azkar.primary_source' => 'provenance-denied']);
    app(PackBuilder::class)->build($resource);

    $ids = collect($this->getJson('/api/v1/content/manifest')->assertOk()->json('resources'))->pluck('id')->all();

    expect($ids)->toContain($resource->id);
});
