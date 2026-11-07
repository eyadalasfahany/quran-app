<?php

declare(strict_types=1);

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

// RefreshDatabase: the migration only inserts and deletes rows (no DDL), so each parallel process uses its own database.
uses(RefreshDatabase::class);

/*
| ADR 0076 gap-report extension: the two dataset provenance rows. Both stay pending; the notes state the licence claim.
*/

function datasetSourcesMigration(): object
{
    $files = glob(database_path('migrations/*_insert_meeatif_and_hadithjson_content_sources.php')) ?: [];

    expect($files)->toHaveCount(1);

    return require $files[0];
}

it('inserts meeatif as pending with the uploader MIT claim in its notes', function (): void {
    datasetSourcesMigration()->up();

    $source = DB::table('content_sources')->where('code', 'meeatif')->first();

    expect($source)->not->toBeNull()
        ->and($source->permission_status)->toBe('pending')
        ->and($source->notes)->toBe('sunnah.com-derived dataset; licence: uploader MIT claim')
        ->and($source->attribution_ar)->toBe('بعض نصوص الأحاديث: مجموعة بيانات meeAtif/hadith_datasets')
        ->and($source->attribution_en)->toBe('Some hadith texts: meeAtif/hadith_datasets dataset');
});

it('inserts hadithjson as pending with no licence in its notes', function (): void {
    datasetSourcesMigration()->up();

    $source = DB::table('content_sources')->where('code', 'hadithjson')->first();

    expect($source)->not->toBeNull()
        ->and($source->permission_status)->toBe('pending')
        ->and($source->notes)->toBe('sunnah.com-derived dataset; no licence')
        ->and($source->attribution_ar)->toBe('بعض نصوص الأحاديث: مجموعة بيانات hadith-json')
        ->and($source->attribution_en)->toBe('Some hadith texts: hadith-json dataset');
});

it('removes both rows on rollback and leaves the others', function (): void {
    $migration = datasetSourcesMigration();
    $migration->up();
    $migration->down();

    expect(DB::table('content_sources')->whereIn('code', ['meeatif', 'hadithjson'])->exists())->toBeFalse()
        ->and(DB::table('content_sources')->where('code', 'fawazahmed0')->exists())->toBeTrue();
});
