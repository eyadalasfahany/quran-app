<?php

declare(strict_types=1);

/*
| plan docs/plans/azkar-duas-split.md, step 2: azkar:entry-types-check checks every key of config azkar_entry_types.php
| against the pinned OpenDua catalogue and config azkar.excluded_entries. It fails on any error; candidates are warnings.
| The catalogue is the placeholder fixture (entries 1 to 4), passed as the path argument. Nothing here is Azkar text.
*/

use Illuminate\Support\Facades\File;

beforeEach(function (): void {
    config([
        'azkar.opendua.catalogue_sha256' => hash_file('sha256', etcFixturePath()),
        'azkar.excluded_entries' => [],
        'azkar_entry_types.entries' => [],
    ]);
});

function etcFixturePath(): string
{
    return base_path('tests/Fixtures/azkar/opendua-fixture.json');
}

it('passes an empty config with zero counts', function (): void {
    $this->artisan('azkar:entry-types-check', ['path' => etcFixturePath()])
        ->expectsOutputToContain('azkar:entry-types-check passed.')
        ->assertExitCode(0);
});

it('applies a reviewed row whose key is in the catalogue', function (): void {
    config(['azkar_entry_types.entries' => [
        'hisn-al-muslim:entry-000001' => ['type' => 'dhikr', 'status' => 'reviewed', 'evidence' => 'checked'],
    ]]);

    $this->artisan('azkar:entry-types-check', ['path' => etcFixturePath()])
        ->expectsOutputToContain('Reviewed rows applied: 1')
        ->assertExitCode(0);
});

it('lists a candidate row as a warning and still passes', function (): void {
    config(['azkar_entry_types.entries' => [
        'hisn-al-muslim:entry-000002' => ['type' => 'dua', 'status' => 'candidate', 'evidence' => 'claude:text-rule'],
    ]]);

    $this->artisan('azkar:entry-types-check', ['path' => etcFixturePath()])
        ->expectsOutputToContain('1 candidate row(s) are not applied')
        ->expectsOutputToContain('Reviewed rows applied: 0')
        ->assertExitCode(0);
});

it('fails on an unknown type', function (): void {
    config(['azkar_entry_types.entries' => [
        'hisn-al-muslim:entry-000001' => ['type' => 'prayer', 'status' => 'candidate', 'evidence' => 'claude:text-rule'],
    ]]);

    $this->artisan('azkar:entry-types-check', ['path' => etcFixturePath()])
        ->expectsOutputToContain('invalid row (unknown_type)')
        ->assertExitCode(1);
});

it('fails on a row without evidence', function (): void {
    config(['azkar_entry_types.entries' => [
        'hisn-al-muslim:entry-000001' => ['type' => 'dhikr', 'status' => 'candidate'],
    ]]);

    $this->artisan('azkar:entry-types-check', ['path' => etcFixturePath()])
        ->expectsOutputToContain('invalid row (missing_evidence)')
        ->assertExitCode(1);
});

it('fails on a key that is not in the pinned catalogue', function (): void {
    config(['azkar_entry_types.entries' => [
        'hisn-al-muslim:entry-000099' => ['type' => 'dhikr', 'status' => 'reviewed', 'evidence' => 'checked'],
    ]]);

    $this->artisan('azkar:entry-types-check', ['path' => etcFixturePath()])
        ->expectsOutputToContain('hisn-al-muslim:entry-000099: not an entry of the pinned catalogue')
        ->assertExitCode(1);
});

it('fails on a key of an excluded entry', function (): void {
    config([
        'azkar.excluded_entries' => ['hisn-al-muslim:entry-000001' => 'quran_partial_verse'],
        'azkar_entry_types.entries' => [
            'hisn-al-muslim:entry-000001' => ['type' => 'dhikr', 'status' => 'reviewed', 'evidence' => 'checked'],
        ],
    ]);

    $this->artisan('azkar:entry-types-check', ['path' => etcFixturePath()])
        ->expectsOutputToContain('hisn-al-muslim:entry-000001: excluded in config azkar.excluded_entries')
        ->assertExitCode(1);
});

it('fails when the catalogue does not match its pinned checksum', function (): void {
    config([
        'azkar.opendua.catalogue_sha256' => str_repeat('0', 64),
        'azkar_entry_types.entries' => [],
    ]);

    $this->artisan('azkar:entry-types-check', ['path' => etcFixturePath()])
        ->expectsOutputToContain('does not match the pinned SHA-256')
        ->assertExitCode(1);
});

it('fails with a clear message when the catalogue file is missing', function (): void {
    $missing = storage_path('framework/testing/azkar-etc/missing.json');
    File::deleteDirectory(dirname($missing));

    $this->artisan('azkar:entry-types-check', ['path' => $missing])
        ->expectsOutputToContain('The catalogue cannot be read')
        ->assertExitCode(1);
});
