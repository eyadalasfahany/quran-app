<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;

// No RefreshDatabase: the create migrations run DDL, which commits any open transaction on MySQL.
// Each test restores the row it changes, so later tests see the seeded sources.

beforeEach(function (): void {
    $this->artisan('migrate')->assertSuccessful();
});

function hadithMigration(string $name): object
{
    $files = glob(database_path('migrations/*_'.$name.'.php')) ?: [];

    expect($files)->toHaveCount(1);

    return require $files[0];
}

it('seeds fawazahmed0 as not_required with the Unlicense and the provenance note', function (): void {
    $migration = hadithMigration('insert_fawazahmed0_content_source');

    $migration->down();
    expect(DB::table('content_sources')->where('code', 'fawazahmed0')->exists())->toBeFalse();

    $migration->up();
    $migration->up();

    $rows = DB::table('content_sources')->where('code', 'fawazahmed0')->get();

    expect($rows)->toHaveCount(1);

    $source = $rows->first();

    expect($source->permission_status)->toBe('not_required')
        ->and($source->name)->toBe('fawazahmed0/hadith-api')
        ->and($source->licence_url)->toContain('df57907be35291c91ad6a6691180e22ca9920784')
        ->and($source->licence_url)->toEndWith('/LICENSE')
        ->and($source->attribution_en)->toBe('Source: fawazahmed0/hadith-api (Unlicense)')
        ->and($source->notes)->toContain('Unlicense')
        ->and($source->notes)->toContain('ADR 0042');
});

it('seeds sunnahcom as pending with an empty Arabic attribution', function (): void {
    $migration = hadithMigration('insert_sunnahcom_content_source');

    $migration->down();
    expect(DB::table('content_sources')->where('code', 'sunnahcom')->exists())->toBeFalse();

    $migration->up();
    $migration->up();

    $rows = DB::table('content_sources')->where('code', 'sunnahcom')->get();

    expect($rows)->toHaveCount(1);

    $source = $rows->first();

    expect($source->permission_status)->toBe('pending')
        ->and($source->attribution_ar)->toBe('')
        ->and($source->attribution_en)->toBe('Sunnah.com');
});

it('its down removes only its own row', function (): void {
    $migration = hadithMigration('insert_fawazahmed0_content_source');

    $migration->up();
    $migration->down();

    expect(DB::table('content_sources')->where('code', 'fawazahmed0')->exists())->toBeFalse()
        ->and(DB::table('content_sources')->where('code', 'sunnahcom')->exists())->toBeTrue()
        ->and(DB::table('content_sources')->where('code', 'opendua')->exists())->toBeTrue();

    $migration->up();
});
