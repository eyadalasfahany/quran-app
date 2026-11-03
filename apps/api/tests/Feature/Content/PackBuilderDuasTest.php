<?php

declare(strict_types=1);

use App\Domains\Content\Enums\PermissionStatus;
use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Packs\PackBuilder;
use App\Domains\Content\Packs\PackBuildException;
use App\Domains\Duas\Models\DuaHadith;
use Database\Factories\DuaHadithFactory;
use Database\Factories\DuaItemFactory;
use Database\Factories\DuaLinkFactory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Http::preventStrayRequests();
    Storage::fake('local');
});

it('copies duas columns from the shared contract and drops server-only fields', function (): void {
    $hadith = DuaHadithFactory::new()->create();
    $resource = Resource::query()->findOrFail($hadith->resource_id);
    $resource->update(['group' => ResourceGroup::Duas, 'version' => 2]);

    ContentSource::query()->where('code', 'hadeethenc')->update([
        'permission_status' => PermissionStatus::Granted->value,
    ]);

    $gzipped = Storage::disk('local')->get(app(PackBuilder::class)->build($resource)->path);
    expect($gzipped)->toBeString();

    $pdo = openDuasContentPack($gzipped);
    $row = $pdo->query('SELECT * FROM dua_hadith')->fetch();
    expect($row)->toBeArray()
        ->and(array_key_exists('source_text_sha256', $row))->toBeFalse()
        ->and(array_key_exists('source_id', $row))->toBeFalse()
        ->and((int) $row['item_id'])->toBe($hadith->item_id)
        ->and($row['hadeeth'])->toBe($hadith->hadeeth);
});

it('packs only reviewed dua link rows', function (): void {
    $item = DuaItemFactory::new()->create();
    $resource = Resource::query()->findOrFail($item->resource_id);
    $resource->update(['group' => ResourceGroup::Duas, 'version' => 1]);

    DuaLinkFactory::new()->create([
        'resource_id' => $item->resource_id,
        'item_id' => $item->id,
        'review_status' => 'candidate',
    ]);
    DuaLinkFactory::new()->create([
        'resource_id' => $item->resource_id,
        'item_id' => $item->id,
        'review_status' => 'reviewed',
        'entry_key' => 'hisn-al-muslim:entry-000002',
    ]);

    $gzipped = Storage::disk('local')->get(app(PackBuilder::class)->build($resource)->path);
    expect($gzipped)->toBeString();

    $pdo = openDuasContentPack($gzipped);
    expect((int) $pdo->query('SELECT COUNT(*) FROM dua_links')->fetchColumn())->toBe(1);
    $row = $pdo->query('SELECT entry_key FROM dua_links')->fetch();
    expect($row['entry_key'])->toBe('hisn-al-muslim:entry-000002');
});

it('refuses to build a duas pack with prophetic rows when hadeethenc is not granted', function (): void {
    DuaHadithFactory::new()->create();
    $resource = Resource::query()->where('group', ResourceGroup::Duas->value)->firstOrFail();

    ContentSource::query()->where('code', 'hadeethenc')->update([
        'permission_status' => PermissionStatus::Pending->value,
    ]);

    expect(fn () => app(PackBuilder::class)->build($resource))->toThrow(PackBuildException::class);
});

it('builds a duas pack with no prophetic rows even when hadeethenc is pending', function (): void {
    $item = DuaItemFactory::new()->quran()->create();
    $resource = Resource::query()->findOrFail($item->resource_id);
    $resource->update(['group' => ResourceGroup::Duas, 'version' => 1]);

    ContentSource::query()->where('code', 'hadeethenc')->update([
        'permission_status' => PermissionStatus::Pending->value,
    ]);

    expect(DuaHadith::query()->where('resource_id', $resource->id)->exists())->toBeFalse();

    $pack = app(PackBuilder::class)->build($resource);

    expect($pack->rowCount)->toBeGreaterThan(0);
});

function openDuasContentPack(string $gzipped): PDO
{
    $raw = gzdecode($gzipped);
    expect($raw)->toBeString();

    $path = tempnam(sys_get_temp_dir(), 'duas-content-pack-');
    expect($path)->toBeString();

    file_put_contents($path, $raw);

    return new PDO('sqlite:'.$path, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
}
