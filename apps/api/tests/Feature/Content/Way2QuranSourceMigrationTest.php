<?php

declare(strict_types=1);

use App\Domains\Content\Enums\PermissionStatus;
use App\Domains\Content\Models\ContentSource;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function way2QuranSourceMigration(): object
{
    return require glob(database_path('migrations/*_insert_way2quran_content_source.php'))[0];
}

it('seeds the way2quran content source row after migrate', function (): void {
    $source = ContentSource::query()->where('code', 'way2quran')->sole();

    expect($source->name)->toBe('Way2Quran')
        ->and($source->licence_url)->toBe('https://way2quran.com')
        ->and($source->permission_status)->toBe(PermissionStatus::Granted)
        ->and($source->attribution_ar)->not->toBe('')
        ->and($source->attribution_en)->not->toBe('')
        ->and($source->notes)->toContain('7 Nov 2026')
        ->and($source->notes)->toContain('Midad');
});

it('leaves one row when up() runs twice', function (): void {
    way2QuranSourceMigration()->up();
    way2QuranSourceMigration()->up();

    expect(DB::table('content_sources')->where('code', 'way2quran')->count())->toBe(1);
});

it('converges a pre-existing local row to the migration values and keeps created_at', function (): void {
    $createdAt = '2026-01-01 00:00:00';
    DB::table('content_sources')->where('code', 'way2quran')->update([
        'notes' => 'LOCAL PILOT',
        'attribution_en' => 'pilot wording',
        'permission_status' => 'pending',
        'created_at' => $createdAt,
    ]);

    way2QuranSourceMigration()->up();

    $row = DB::table('content_sources')->where('code', 'way2quran')->first();

    expect($row->notes)->not->toBe('LOCAL PILOT')
        ->and($row->attribution_en)->toBe('Way2Quran (way2quran.com)')
        ->and($row->permission_status)->toBe('granted')
        ->and(substr((string) $row->created_at, 0, 19))->toBe($createdAt);
});
