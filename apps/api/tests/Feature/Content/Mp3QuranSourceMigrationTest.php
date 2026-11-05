<?php

declare(strict_types=1);

use App\Domains\Content\Enums\PermissionStatus;
use App\Domains\Content\Models\ContentSource;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function mp3QuranSourceMigration(): object
{
    return require glob(database_path('migrations/*_insert_mp3quran_content_source.php'))[0];
}

it('seeds the mp3quran content source row after migrate', function (): void {
    $source = ContentSource::query()->where('code', 'mp3quran')->sole();

    expect($source->permission_status)->toBe(PermissionStatus::Granted)
        ->and($source->attribution_ar)->not->toBe('')
        ->and($source->attribution_en)->not->toBe('');
});

it('leaves one row when up() runs twice', function (): void {
    mp3QuranSourceMigration()->up();
    mp3QuranSourceMigration()->up();

    expect(DB::table('content_sources')->where('code', 'mp3quran')->count())->toBe(1);
});

it('converges a pre-existing pilot row to the migration values and keeps created_at', function (): void {
    $createdAt = '2026-01-01 00:00:00';
    DB::table('content_sources')->where('code', 'mp3quran')->update([
        'notes' => 'LOCAL PILOT',
        'attribution_ar' => 'pilot wording',
        'created_at' => $createdAt,
    ]);

    mp3QuranSourceMigration()->up();

    $row = DB::table('content_sources')->where('code', 'mp3quran')->first();

    expect($row->notes)->toBe('Written permission is held by the developer; its wording is not quoted here (ADR 0061 decision 1).')
        ->and($row->attribution_ar)->toBe('MP3Quran (mp3quran.net)')
        ->and(substr((string) $row->created_at, 0, 19))->toBe($createdAt);
});
