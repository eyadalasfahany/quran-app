<?php

declare(strict_types=1);

use App\Domains\Content\Models\ContentSource;
use App\Domains\Hadith\Import\Records\HadithImportPlan;
use App\Domains\Hadith\Repositories\Contracts\HadithImportRepository;
use App\Domains\Hadith\Services\HadithImporter;
use App\Domains\Hadith\Sources\SnapshotStore;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

require_once __DIR__.'/../Support/HadithFixtureFiles.php';
require_once __DIR__.'/../Support/HadithImportFixtures.php';

uses(RefreshDatabase::class);

/*
| hadith:import (step 6). Faked CDN, temporary cache, temporary report path. Placeholder text only.
*/

beforeEach(function (): void {
    Http::preventStrayRequests();
    Storage::fake('local');
    config(['hadith.range_corrections' => []]);
    hadithImportUse(hadithImportFiles());
    hadithImportWarm();
});

afterEach(function (): void {
    File::deleteDirectory((string) config('content_sources.cache_root'));
    File::delete(hadithImportReportPath());
});

function hadithImportReportPath(): string
{
    return storage_path('framework/testing/hadith-import-report-test.json');
}

function hadithImportCommand(array $arguments): int
{
    return Artisan::call('hadith:import', $arguments + ['--report' => hadithImportReportPath()]);
}

it('is registered', function (): void {
    $commands = array_keys(Artisan::all());

    expect($commands)->toContain('hadith:import', 'hadith:match-section-titles', 'hadith:snapshot');
});

it('imports with --defer-pack, prints a table and writes a report with counts only', function (): void {
    expect(hadithImportCommand(['--collection' => ['bukhari'], '--defer-pack' => true]))->toBe(0);

    $output = Artisan::output();
    $report = json_decode(File::get(hadithImportReportPath()), true, flags: JSON_THROW_ON_ERROR);

    expect($output)->toContain('bukhari')->toContain('imported')->toContain('Report written to:')
        ->and($report['collections'][0]['counts']['imported'])->toBe(4)
        ->and($output)->not->toContain('FIXTURE text')->not->toContain('نص تجريبي')
        ->and(json_encode($report, JSON_THROW_ON_ERROR))->not->toContain('FIXTURE text');
});

it('--dry-run writes no rows', function (): void {
    expect(hadithImportCommand(['--dry-run' => true, '--collection' => ['bukhari']]))->toBe(0);

    expect(Artisan::output())->toContain('valid');
    expect(App\Domains\Content\Models\Resource::query()->count())->toBe(0);
});

it('--collection imports only the named slugs', function (): void {
    hadithImportCommand(['--defer-pack' => true, '--collection' => ['muslim']]);

    expect(App\Domains\Content\Models\Resource::query()->where('source_key', 'muslim')->exists())->toBeTrue()
        ->and(App\Domains\Content\Models\Resource::query()->where('source_key', 'bukhari')->exists())->toBeFalse();
});

it('rejects an unknown --collection, names the valid slugs and makes no request', function (): void {
    Http::fake();

    expect(hadithImportCommand(['--collection' => ['not-a-collection']]))->toBe(1)
        ->and(Artisan::output())->toContain('not-a-collection')->toContain('bukhari');

    Http::assertNothingSent();
});

it('rejects --build-packs together with --defer-pack', function (): void {
    expect(hadithImportCommand(['--build-packs' => true, '--defer-pack' => true]))->toBe(1)
        ->and(Artisan::output())->toContain('Choose --build-packs or --defer-pack');
});

it('rejects --verify with --dry-run', function (): void {
    expect(hadithImportCommand(['--verify' => true, '--dry-run' => true]))->toBe(1);
});

it('--download fetches and verifies the twelve files first', function (): void {
    File::deleteDirectory(app(SnapshotStore::class)->directory());
    $before = count(Http::recorded());

    expect(hadithImportCommand(['--download' => true, '--defer-pack' => true, '--collection' => ['bukhari']]))->toBe(0)
        ->and(Artisan::output())->toContain('Snapshot verified: 12 files.')
        ->and(count(Http::recorded()) - $before)->toBe(12);
});

it('without --download and an empty cache it exits 0 and says to use --download', function (): void {
    File::deleteDirectory(app(SnapshotStore::class)->directory());
    Http::fake();

    expect(hadithImportCommand(['--defer-pack' => true, '--collection' => ['bukhari']]))->toBe(0)
        ->and(Artisan::output())->toContain('Run hadith:import --download.');

    Http::assertNothingSent();
});

it('exits 1 when a collection is invalid', function (): void {
    hadithImportUse(hadithImportFiles(function (string $path, array $data): array {
        if ($path === 'editions/ara-bukhari.json') {
            $data['hadiths'][] = ['hadithnumber' => 1, 'arabicnumber' => 9, 'text' => 'FIXTURE duplicate', 'grades' => [], 'reference' => ['book' => 1, 'hadith' => 1]];
        }

        return $data;
    }));
    hadithImportWarm();

    expect(hadithImportCommand(['--defer-pack' => true, '--collection' => ['bukhari']]))->toBe(1);
});

it('exits 1 when another import holds the lock and prints the lock message', function (): void {
    $lock = Cache::lock(HadithImporter::LOCK_KEY, 10);
    $lock->get();

    expect(hadithImportCommand(['--defer-pack' => true]))->toBe(1)
        ->and(Artisan::output())->toContain('Another Hadith import is already running.');

    $lock->release();
});

it('--verify exits 0 on clean rows and 1 on an altered row', function (): void {
    hadithImportCommand(['--defer-pack' => true, '--collection' => ['bukhari']]);

    expect(hadithImportCommand(['--verify' => true, '--collection' => ['bukhari']]))->toBe(0);

    DB::table('hadith_entries')->where('source_key', 'fawazahmed0:bukhari:1')->update(['text_ar' => 'FIXTURE altered']);

    expect(hadithImportCommand(['--verify' => true, '--collection' => ['bukhari']]))->toBe(1);
});

it('prints no exception message other than the domain messages', function (): void {
    hadithImportBindRepository(fn (HadithImportRepository $inner): HadithImportRepository => new class($inner) implements HadithImportRepository
    {
        public function __construct(private readonly HadithImportRepository $inner) {}

        public function source(string $code): ?ContentSource
        {
            return $this->inner->source($code);
        }

        public function storedCounts(int $resourceId): ?array
        {
            return $this->inner->storedCounts($resourceId);
        }

        public function replaceForResource(int $resourceId, HadithImportPlan $plan): void
        {
            throw new RuntimeException('FIXTURE failure with FIXTURE text 1');
        }

        public function entryTexts(int $resourceId): Generator
        {
            return $this->inner->entryTexts($resourceId);
        }
    });

    hadithImportCommand(['--defer-pack' => true, '--collection' => ['bukhari']]);

    expect(Artisan::output())->toContain('RuntimeException')->not->toContain('FIXTURE failure');
});
