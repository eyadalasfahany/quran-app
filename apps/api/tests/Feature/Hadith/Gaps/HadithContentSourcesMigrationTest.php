<?php

declare(strict_types=1);

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

// RefreshDatabase: the migration only inserts and deletes rows (no DDL), so each parallel process uses its own database.
uses(RefreshDatabase::class);

function openitiMigration(): object
{
    $files = glob(database_path('migrations/*_insert_openiti_and_hadithapicom_content_sources.php')) ?: [];

    expect($files)->toHaveCount(1);

    return require $files[0];
}

it('inserts openiti as granted with the licence deed link', function (): void {
    $migration = openitiMigration();

    $migration->up();

    $source = DB::table('content_sources')->where('code', 'openiti')->first();

    expect($source)->not->toBeNull()
        ->and($source->permission_status)->toBe('granted')
        ->and($source->licence_url)->toBe('https://creativecommons.org/licenses/by-nc-sa/4.0/')
        ->and($source->name)->toBe('OpenITI (Open Islamicate Texts Initiative)')
        ->and($source->notes)->toContain('10.5281/zenodo.10007820')
        ->and($source->notes)->toContain('01a1544130e0236850ef2698923ad01575c5bd7c');
});

it('inserts hadithapicom as pending with the no-terms note', function (): void {
    $migration = openitiMigration();

    $migration->up();

    $source = DB::table('content_sources')->where('code', 'hadithapicom')->first();

    expect($source)->not->toBeNull()
        ->and($source->permission_status)->toBe('pending')
        ->and($source->licence_url)->toBe('https://hadithapi.com')
        ->and($source->notes)->toContain('publishes no terms');
});

it('gives both rows non-empty attribution in both languages', function (): void {
    $migration = openitiMigration();

    $migration->up();

    $rows = DB::table('content_sources')->whereIn('code', ['openiti', 'hadithapicom'])->get();

    expect($rows)->toHaveCount(2);

    foreach ($rows as $row) {
        expect($row->attribution_ar)->not->toBe('')
            ->and($row->attribution_en)->not->toBe('');
    }
});

it('updates a stale local row instead of failing', function (): void {
    $migration = openitiMigration();

    DB::table('content_sources')->where('code', 'openiti')->update(['attribution_en' => 'STALE FIXTURE value']);

    $migration->up();
    $migration->up();

    $rows = DB::table('content_sources')->where('code', 'openiti')->get();

    expect($rows)->toHaveCount(1)
        ->and($rows->first()->attribution_en)->toContain('OpenITI');
});

it('removes both rows on rollback', function (): void {
    $migration = openitiMigration();

    $migration->up();
    $migration->down();

    expect(DB::table('content_sources')->whereIn('code', ['openiti', 'hadithapicom'])->exists())->toBeFalse()
        ->and(DB::table('content_sources')->where('code', 'fawazahmed0')->exists())->toBeTrue();

    $migration->up();
});
