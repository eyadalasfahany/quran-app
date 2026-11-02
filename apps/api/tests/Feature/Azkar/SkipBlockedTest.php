<?php

declare(strict_types=1);

use App\Domains\Azkar\Data\ImportReport;
use App\Domains\Azkar\Services\AzkarImporter;
use App\Domains\Content\Models\AzkarEntry;
use App\Domains\Content\Models\ContentSource;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;

/*
| ADR 0031 §11: --skip-blocked is a local partial import. Production never skips: it imports every entry or none.
| Placeholder fixture only; the fixture item's spans are «نص تجريبي» and stay unmatched here.
*/

uses(RefreshDatabase::class);

const SKP_ENTRY = 'hisn-al-muslim:entry-000004';

beforeEach(function (): void {
    Bus::fake();
    config([
        'azkar.opendua.catalogue_sha256' => hash_file('sha256', skpFixturePath()),
        'azkar.quran_references' => [],
    ]);
    ContentSource::query()->where('code', 'opendua')->update(['permission_status' => 'granted']);
});

afterEach(function (): void {
    app()->detectEnvironment(fn (): string => 'testing');
});

function skpFixturePath(): string
{
    return base_path('tests/Fixtures/azkar/opendua-fixture.json');
}

function skpEnvironment(string $environment): void
{
    app()->detectEnvironment(fn (): string => $environment);
}

it('locally, leaves out the entry with unreviewed Quran spans and imports the rest', function (): void {
    skpEnvironment('local');

    $report = app(AzkarImporter::class)->run(skpFixturePath(), false, false, true);

    expect($report->status)->toBe(ImportReport::STATUS_IMPORTED)
        ->and($report->content['entries_skipped'])->toBe(1)
        ->and($report->content['skipped'])->toBe([['entry' => SKP_ENTRY, 'codes' => ['quran_reference_unreviewed']]])
        ->and(AzkarEntry::query()->where('entry_key', SKP_ENTRY)->exists())->toBeFalse()
        ->and(AzkarEntry::query()->count())->toBe(3);
});

it('without the flag, an entry error fails the import and writes nothing', function (): void {
    skpEnvironment('local');

    $report = app(AzkarImporter::class)->run(skpFixturePath(), false);

    expect($report->status)->toBe(ImportReport::STATUS_INVALID)
        ->and(AzkarEntry::query()->count())->toBe(0);
});

it('still fails on a file-level error even with the flag, because it is not an entry', function (): void {
    skpEnvironment('local');
    config(['azkar.opendua.catalogue_sha256' => str_repeat('0', 64)]);

    $report = app(AzkarImporter::class)->run(skpFixturePath(), false, false, true);

    expect($report->status)->toBe(ImportReport::STATUS_INVALID)
        ->and(AzkarEntry::query()->count())->toBe(0);
});

it('refuses the skip in production, in the importer, and writes nothing', function (): void {
    skpEnvironment('production');

    expect(fn () => app(AzkarImporter::class)->run(skpFixturePath(), false, false, true))
        ->toThrow(LogicException::class, 'refused in production');

    expect(AzkarEntry::query()->count())->toBe(0);
});

it('the command refuses --skip-blocked in production and exits non-zero', function (): void {
    skpEnvironment('production');

    $this->artisan('azkar:import', ['path' => skpFixturePath(), '--skip-blocked' => true, '--report' => storage_path('framework/testing/azkar-map/skip.json')])
        ->expectsOutputToContain('local only')
        ->assertExitCode(1);

    expect(AzkarEntry::query()->count())->toBe(0);
});

it('the command imports locally with --skip-blocked and lists the left-out entry', function (): void {
    skpEnvironment('local');

    $this->artisan('azkar:import', ['path' => skpFixturePath(), '--skip-blocked' => true, '--report' => storage_path('framework/testing/azkar-map/skip.json')])
        ->expectsOutputToContain('Left out (blocked): '.SKP_ENTRY)
        ->assertExitCode(0);
});
