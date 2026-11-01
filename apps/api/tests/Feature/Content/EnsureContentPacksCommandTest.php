<?php

declare(strict_types=1);

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Models\ContentPack;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Packs\PackBuilder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Http::preventStrayRequests();
    Storage::fake('local');
});

it('builds packs whose database row exists but whose file is missing', function (): void {
    $resource = Resource::factory()->create([
        'group' => ResourceGroup::Tafsirs,
        'version' => 2,
        'is_active' => true,
    ]);
    $pack = app(PackBuilder::class)->build($resource);
    Storage::disk('local')->delete($pack->path);

    $this->artisan('content:ensure-packs')
        ->assertSuccessful()
        ->expectsOutputToContain('OK '.$resource->id);

    expect(Storage::disk('local')->exists($pack->path))->toBeTrue()
        ->and(ContentPack::query()->count())->toBe(1);
});

it('prunes orphaned rows before building when asked', function (): void {
    $resource = Resource::factory()->create([
        'group' => ResourceGroup::Tafsirs,
        'version' => 2,
        'is_active' => true,
    ]);
    $pack = app(PackBuilder::class)->build($resource);
    Storage::disk('local')->delete($pack->path);

    $this->artisan('content:ensure-packs', ['--prune-orphans' => true])
        ->assertSuccessful()
        ->expectsOutputToContain('Pruned 1 orphaned pack row(s).')
        ->expectsOutputToContain('OK '.$resource->id);

    expect(Storage::disk('local')->exists($pack->path))->toBeTrue();
});
