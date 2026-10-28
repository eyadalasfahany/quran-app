<?php

declare(strict_types=1);

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Models\TafsirEntry;
use App\Domains\Content\Packs\PackBuilder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Storage::fake('local');
});

it('deletes the data of non-Arabic tafsirs and deactivates them, keeping Arabic tafsirs', function (): void {
    $arabic = Resource::factory()->create(['group' => ResourceGroup::Tafsirs, 'language_code' => 'ar', 'version' => 1]);
    $english = Resource::factory()->create(['group' => ResourceGroup::Tafsirs, 'language_code' => 'en', 'version' => 1]);
    $unknown = Resource::factory()->create(['group' => ResourceGroup::Tafsirs, 'language_code' => null, 'version' => 1]);

    foreach ([$arabic, $english, $unknown] as $resource) {
        TafsirEntry::factory()->create(['resource_id' => $resource->id]);
        app(PackBuilder::class)->build($resource);
    }

    $migration = require glob(database_path('migrations/*_deactivate_non_arabic_tafsirs.php'))[0];
    $migration->up();

    expect($arabic->fresh()->is_active)->toBeTrue()
        ->and($english->fresh()->is_active)->toBeFalse()
        ->and($unknown->fresh()->is_active)->toBeFalse()
        ->and(TafsirEntry::query()->where('resource_id', $arabic->id)->count())->toBe(1)
        ->and(TafsirEntry::query()->whereIn('resource_id', [$english->id, $unknown->id])->count())->toBe(0)
        ->and(DB::table('content_packs')->where('resource_id', $arabic->id)->count())->toBe(1)
        ->and(DB::table('content_packs')->whereIn('resource_id', [$english->id, $unknown->id])->count())->toBe(0);
});
