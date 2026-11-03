<?php

declare(strict_types=1);

use App\Domains\Content\Enums\PermissionStatus;
use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Packs\PackBuilder;
use App\Domains\Content\Packs\PackBuildException;
use App\Domains\Names\Data\ImportReport;
use App\Domains\Names\Services\NamesImporter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Storage::fake('local');
});

it('refuses names:import while the content source is pending', function (): void {
    expect(ContentSource::query()->where('code', 'names-tirmidhi')->value('permission_status'))->toBe(PermissionStatus::Pending);

    $report = app(NamesImporter::class)->run(null);

    expect($report->status)->toBe(ImportReport::STATUS_REFUSED);
});

it('refuses a names pack build while the content source is pending', function (): void {
    $sourceId = ContentSource::query()->where('code', 'names-tirmidhi')->value('id');

    $resource = Resource::factory()->create([
        'source_id' => $sourceId,
        'group' => ResourceGroup::Names,
        'source_key' => 'tirmidhi',
        'version' => 1,
    ]);

    expect(fn () => app(PackBuilder::class)->build($resource))
        ->toThrow(PackBuildException::class);
});

it('allows a names pack build after the source is granted', function (): void {
    ContentSource::query()->where('code', 'names-tirmidhi')->update(['permission_status' => 'granted']);

    $sourceId = ContentSource::query()->where('code', 'names-tirmidhi')->value('id');

    $resource = Resource::factory()->create([
        'source_id' => $sourceId,
        'group' => ResourceGroup::Names,
        'source_key' => 'tirmidhi',
        'version' => 1,
    ]);

    $pack = app(PackBuilder::class)->build($resource);

    expect($pack->rowCount)->toBe(0);
});
