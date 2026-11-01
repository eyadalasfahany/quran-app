<?php

declare(strict_types=1);

use App\Domains\Azkar\Data\ImportReport;
use App\Domains\Azkar\Services\AzkarImporter;
use App\Domains\Content\Models\AzkarItem;
use App\Domains\Content\Models\ContentSource;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;

/*
| ADR 0031 §11: the importer accepts reviewed rows everywhere, candidate rows outside production (listed as warnings),
| and unmatched rows never. Placeholder fixture only; the spans hold «نص تجريبي».
*/

uses(RefreshDatabase::class);

const QRS_ITEM = 'hisn-al-muslim:entry-000004:evening:1';

beforeEach(function (): void {
    Bus::fake();
    config([
        'azkar.opendua.catalogue_sha256' => hash_file('sha256', qrsFixturePath()),
        'azkar.opendua.store_english' => false,
    ]);
});

afterEach(function (): void {
    app()->detectEnvironment(fn (): string => 'testing');
});

function qrsFixturePath(): string
{
    return base_path('tests/Fixtures/azkar/opendua-fixture.json');
}

function qrsEnvironment(string $environment): void
{
    app()->detectEnvironment(fn (): string => $environment);
}

/**
 * Both spans of the fixture item, with one status each.
 *
 * @param  list<string>  $statuses
 */
function qrsUseStatuses(array $statuses): void
{
    config(['azkar.quran_references' => [QRS_ITEM => [
        [1, 1, 7, 'status' => $statuses[0], 'evidence' => 'fixture'],
        [2, 1, null, 'status' => $statuses[1], 'evidence' => 'fixture'],
    ]]]);
}

/**
 * @return list<string>
 */
function qrsCodes(ImportReport $report, string $severity): array
{
    $issues = $severity === 'error' ? $report->errors() : $report->warnings();

    return array_values(array_map(fn (array $issue): string => $issue['code'], $issues));
}

it('accepts reviewed rows in production and in other environments, with no candidate warnings', function (string $environment): void {
    qrsEnvironment($environment);
    qrsUseStatuses(['reviewed', 'reviewed']);

    $report = app(AzkarImporter::class)->run(qrsFixturePath(), true);

    expect($report->status)->toBe(ImportReport::STATUS_VALID)
        ->and(qrsCodes($report, 'error'))->toBe([])
        ->and(qrsCodes($report, 'warning'))->not->toContain('quran_reference_candidate')
        ->and($report->content['quran_passages'])->toBe(['mapped' => 2, 'unmapped' => 0]);
})->with(['local', 'production']);

it('accepts candidate rows outside production and lists each one as a warning', function (): void {
    qrsEnvironment('local');
    qrsUseStatuses(['candidate', 'candidate']);

    $report = app(AzkarImporter::class)->run(qrsFixturePath(), true);

    expect($report->status)->toBe(ImportReport::STATUS_VALID)
        ->and(qrsCodes($report, 'error'))->toBe([])
        ->and(array_count_values(qrsCodes($report, 'warning'))['quran_reference_candidate'] ?? 0)->toBe(2)
        ->and($report->content['quran_passages'])->toBe(['mapped' => 2, 'unmapped' => 0]);
});

it('blocks candidate rows in production with an error per span and writes nothing', function (): void {
    qrsEnvironment('production');
    qrsUseStatuses(['candidate', 'candidate']);

    $report = app(AzkarImporter::class)->run(qrsFixturePath(), true);

    expect($report->status)->toBe(ImportReport::STATUS_INVALID)
        ->and(qrsCodes($report, 'error'))->toBe(['quran_reference_unreviewed', 'quran_reference_unreviewed'])
        ->and($report->content['entries_blocked'])->toBe(1)
        ->and($report->content['quran_passages'])->toBe(['mapped' => 0, 'unmapped' => 2]);
});

it('blocks an unmatched row in every environment, as an error', function (string $environment): void {
    qrsEnvironment($environment);
    qrsUseStatuses(['unmatched', 'reviewed']);

    $report = app(AzkarImporter::class)->run(qrsFixturePath(), true);

    expect($report->status)->toBe(ImportReport::STATUS_INVALID)
        ->and(qrsCodes($report, 'error'))->toBe(['quran_reference_unreviewed'])
        ->and($report->content['entries_blocked'])->toBe(1);
})->with(['local', 'production']);

it('rejects a row with a status it does not know, as an invalid reference', function (): void {
    qrsEnvironment('local');
    qrsUseStatuses(['approved', 'reviewed']);

    $report = app(AzkarImporter::class)->run(qrsFixturePath(), true);

    expect(qrsCodes($report, 'error'))->toContain('invalid_quran_reference');
});

it('production imports only reviewed rows and writes them when unlocked', function (): void {
    qrsEnvironment('production');
    qrsUseStatuses(['reviewed', 'reviewed']);
    config(['azkar.opendua.import_enabled' => true]);
    ContentSource::query()->where('code', 'opendua')->update(['permission_status' => 'granted']);

    $report = app(AzkarImporter::class)->run(qrsFixturePath(), false);

    expect($report->status)->toBe(ImportReport::STATUS_IMPORTED)
        ->and(AzkarItem::query()->where('item_key', QRS_ITEM)->exists())->toBeTrue()
        ->and(AzkarItem::query()->count())->toBeGreaterThan(0);
});
