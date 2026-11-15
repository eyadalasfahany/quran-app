<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Schema;

/*
| ADR 0093: the word range is two nullable columns added after quran_verse_to. Its down removes them and its up restores
| them. No RefreshDatabase: DDL commits on MySQL, so the test restores the column it drops (as AzkarMigrationTest does).
*/

beforeEach(function (): void {
    $this->artisan('migrate')->assertSuccessful();
});

function awrMigration(): object
{
    $files = glob(database_path('migrations/*_add_word_range_to_azkar_segments_table.php')) ?: [];

    expect($files)->toHaveCount(1);

    return require $files[0];
}

it('adds word_from and word_to as nullable columns, and its down removes them', function (): void {
    $migration = awrMigration();

    $migration->down();

    expect(Schema::hasColumn('azkar_segments', 'word_from'))->toBeFalse()
        ->and(Schema::hasColumn('azkar_segments', 'word_to'))->toBeFalse();

    $migration->up();

    $columns = collect(Schema::getColumns('azkar_segments'))->keyBy('name');

    expect($columns['word_from']['nullable'])->toBeTrue()
        ->and($columns['word_to']['nullable'])->toBeTrue();
});
