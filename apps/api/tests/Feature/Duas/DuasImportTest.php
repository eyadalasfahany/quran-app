<?php

declare(strict_types=1);

use App\Domains\Azkar\Data\ImportReport;
use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Resource;
use App\Domains\Duas\Models\DuaGroup;
use App\Domains\Duas\Models\DuaHadith;
use App\Domains\Duas\Models\DuaItem;
use App\Domains\Duas\Models\DuaQuranSpan;
use App\Domains\Duas\Services\DuasImporter;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Bus::fake();
    ContentSource::query()->where('code', 'hadeethenc')->update(['permission_status' => 'granted']);
    config([
        'duas.hadeethenc.snapshot_date' => '',
        'duas.hadeethenc.snapshot_sha256' => '',
        'duas.collection_books' => [],
    ]);
});

afterEach(function (): void {
    app()->detectEnvironment(fn (): string => 'testing');
    Cache::lock('duas:import')->forceRelease();
});

function duasImportMap(array $overrides = []): void
{
    config(['duas_quran_map' => array_merge([
        'quran:1:1' => [[1, 1, null, 'status' => 'reviewed', 'rule' => 'rule_vocative_rabb']],
        'quran:1:2' => [[1, 2, null, 'status' => 'candidate', 'rule' => 'rule_vocative_rabb']],
        'quran:1:3' => [[1, 3, null, 'status' => 'rejected', 'rule' => 'rule_vocative_rabb']],
        'quran:1:4' => [[1, 4, null, 'status' => 'added', 'rule' => 'rule_vocative_rabb']],
    ], $overrides)]);
}

function duasImportEnvironment(string $environment): void
{
    app()->detectEnvironment(fn (): string => $environment);
}

function duasImportCodes(ImportReport $report, string $severity): array
{
    $issues = $severity === 'error' ? $report->errors() : $report->warnings();

    return array_values(array_map(fn (array $issue): string => $issue['code'], $issues));
}

it('accepts reviewed and added spans outside production and warns on candidates', function (): void {
    duasImportEnvironment('local');
    duasImportMap();

    $report = app(DuasImporter::class)->run(dryRun: true);

    expect($report->status)->toBe(ImportReport::STATUS_VALID)
        ->and($report->content['quran_accepted'])->toBe(3)
        ->and($report->content['quran_skipped'])->toBe(1)
        ->and(duasImportCodes($report, 'warning'))->toContain('quran_span_candidate')
        ->and(duasImportCodes($report, 'error'))->toBe([]);
});

it('blocks candidate spans in production', function (): void {
    duasImportEnvironment('production');
    duasImportMap();

    $report = app(DuasImporter::class)->run(dryRun: true);

    expect($report->status)->toBe(ImportReport::STATUS_INVALID)
        ->and(duasImportCodes($report, 'error'))->toContain('quran_span_unreviewed')
        ->and($report->content['quran_accepted'])->toBe(2);
});

it('imports reviewed rows in production when unlocked', function (): void {
    duasImportEnvironment('production');
    duasImportMap([
        'quran:1:2' => [[1, 2, null, 'status' => 'reviewed', 'rule' => 'rule_vocative_rabb']],
    ]);

    $report = app(DuasImporter::class)->run(dryRun: false, deferPack: true);

    expect($report->status)->toBe(ImportReport::STATUS_IMPORTED)
        ->and(DuaItem::query()->where('kind', 'quran')->count())->toBe(3)
        ->and(DuaQuranSpan::query()->count())->toBe(3);
});

it('keeps the resource version when the fingerprint is unchanged', function (): void {
    duasImportEnvironment('local');
    duasImportMap();

    $first = app(DuasImporter::class)->run(dryRun: false, deferPack: true);
    $resource = Resource::query()->findOrFail($first->resource['id']);
    $version = $resource->version;

    $second = app(DuasImporter::class)->run(dryRun: false, deferPack: true);

    expect($first->status)->toBe(ImportReport::STATUS_IMPORTED)
        ->and($second->status)->toBe(ImportReport::STATUS_UNCHANGED)
        ->and($resource->fresh()->version)->toBe($version);
});

it('fails when the snapshot pin does not match', function (): void {
    duasImportEnvironment('local');
    duasImportMap();

    $date = '2099-01-01';
    $directory = storage_path('app/duas/hadeethenc/'.$date);
    File::ensureDirectoryExists($directory);
    File::put($directory.'/manifest.json', json_encode(['sha256' => str_repeat('a', 64), 'files' => []], JSON_THROW_ON_ERROR));

    config([
        'duas.hadeethenc.snapshot_date' => $date,
        'duas.hadeethenc.snapshot_sha256' => str_repeat('b', 64),
    ]);

    $report = app(DuasImporter::class)->run(dryRun: true);

    expect($report->status)->toBe(ImportReport::STATUS_INVALID)
        ->and(duasImportCodes($report, 'error'))->toContain('snapshot_invalid');

    File::deleteDirectory($directory);
});

it('writes a report with counts only', function (): void {
    duasImportEnvironment('local');
    duasImportMap();

    $path = storage_path('framework/testing/duas-import-report.json');
    File::delete($path);

    $this->artisan('duas:import', ['--dry-run' => true, '--report' => $path])
        ->assertSuccessful();

    $json = File::get($path);
    expect($json)->not->toContain('rule_vocative_rabb')
        ->and($json)->toContain('quran_accepted');

    File::delete($path);
});

it('refuses --local when APP_ENV is production', function (): void {
    duasImportEnvironment('production');

    $this->artisan('duas:import', ['--local' => true, '--dry-run' => true])
        ->assertFailed();
});

it('blocks a second concurrent import', function (): void {
    duasImportEnvironment('local');
    duasImportMap();

    expect(Cache::lock('duas:import', 60)->get())->toBeTrue();

    expect(fn () => app(DuasImporter::class)->run(dryRun: true))
        ->toThrow(LockTimeoutException::class);
});

function duasImportPinnedSnapshot(string $date): string
{
    $directory = storage_path('app/duas/hadeethenc/'.$date);
    File::ensureDirectoryExists($directory);

    $hadithJson = json_encode([
        'id' => '42',
        'title' => 'FIXTURE title — not a dua',
        'hadeeth' => 'FIXTURE hadith 42 — not a dua',
        'attribution' => 'FIXTURE attribution — not a dua',
    ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);

    File::put($directory.'/categories.json', json_encode([
        ['id' => '301', 'title' => 'FIXTURE cat 301', 'parent_id' => null],
    ], JSON_THROW_ON_ERROR));

    File::put($directory.'/list-301-1.json', json_encode([
        'data' => [['id' => '42']],
        'meta' => ['last_page' => 1],
    ], JSON_THROW_ON_ERROR));

    File::put($directory.'/hadith-42.json', $hadithJson);

    $hashes = [
        'categories.json' => hash('sha256', (string) file_get_contents($directory.'/categories.json')),
        'list-301-1.json' => hash('sha256', (string) file_get_contents($directory.'/list-301-1.json')),
        'hadith-42.json' => hash('sha256', $hadithJson),
    ];
    ksort($hashes);
    $manifestSha = hash('sha256', (string) json_encode($hashes, JSON_THROW_ON_ERROR));

    File::put($directory.'/manifest.json', json_encode([
        'sha256' => $manifestSha,
        'categories' => [301],
        'files' => $hashes,
    ], JSON_THROW_ON_ERROR));

    config([
        'duas.hadeethenc.snapshot_date' => $date,
        'duas.hadeethenc.snapshot_sha256' => $manifestSha,
    ]);

    return $directory;
}

it('imports prophetic rows when the duas snapshot pin is set', function (): void {
    duasImportEnvironment('local');
    duasImportMap();

    $date = '2099-03-03';
    duasImportPinnedSnapshot($date);

    $report = app(DuasImporter::class)->run(dryRun: false, deferPack: true);

    expect($report->status)->toBe(ImportReport::STATUS_IMPORTED)
        ->and($report->content['hadith_accepted'])->toBe(1)
        ->and(DuaHadith::query()->count())->toBe(1)
        ->and(DuaGroup::query()->count())->toBe(1)
        ->and(DuaItem::query()->where('kind', 'hadith')->value('group_id'))->toBe(1);

    File::deleteDirectory(storage_path('app/duas/hadeethenc/'.$date));
});
