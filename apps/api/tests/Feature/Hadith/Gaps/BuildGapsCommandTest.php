<?php

declare(strict_types=1);

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

require_once __DIR__.'/../Support/HadithFixtureFiles.php';
require_once __DIR__.'/../Support/HadithImportFixtures.php';
require_once __DIR__.'/../Support/HadithGapFixtures.php';

uses(RefreshDatabase::class);

/*
| hadith:build-gaps as a command (ADR 0076, step 6b.6). The storage path is a temporary folder for each test, so no real
| proposal is written or overwritten. Placeholder text only.
*/

beforeEach(function (): void {
    Http::preventStrayRequests();
    Storage::fake('local');
    config(['hadith.title_match.request_gap_ms' => 0, 'hadith.extra_books' => []]);
    hadithImportUse(gapsFawazahmedFixture());
    hadithImportWarm();
    app()->useStoragePath(storage_path('framework/testing/hadith-command-storage-'.getmypid()));
});

afterEach(function (): void {
    File::deleteDirectory(storage_path('framework/testing/hadith-command-storage-'.getmypid()));
    File::deleteDirectory(gapsDataDirectory());
    File::deleteDirectory(gapsOpenItiDirectory());
    File::deleteDirectory((string) config('content_sources.cache_root'));
});

it('has no --output option', function (): void {
    $options = array_keys(Artisan::all()['hadith:build-gaps']->getDefinition()->getOptions());

    expect($options)->toContain('collection', 'openiti-dir', 'retrieved-on')
        ->and(in_array('output', $options, true))->toBeFalse();
});

it('with no --openiti-dir and no committed decisions file, has nothing to build and writes nothing', function (): void {
    $this->artisan('hadith:build-gaps')
        ->assertSuccessful();

    expect(File::exists(storage_path('app/hadith/proposals/gaps/bukhari.json')))->toBeFalse();
});

it('writes the proposal and its report only under storage/app/hadith/proposals/gaps', function (): void {
    gapsOpenItiFile(gapsStandardUnits());
    gapsDecisionsFile([gapsEntry('3', 'fill-safe', 'openiti', '2', '4', 2, '3')]);

    $this->artisan('hadith:build-gaps', ['--collection' => ['bukhari'], '--openiti-dir' => gapsOpenItiDirectory()])
        ->assertSuccessful();

    $directory = storage_path('app/hadith/proposals/gaps');
    $proposal = json_decode(File::get($directory.'/bukhari.json'), true, flags: JSON_THROW_ON_ERROR);
    $report = json_decode(File::get($directory.'/bukhari.report.json'), true, flags: JSON_THROW_ON_ERROR);

    expect($proposal['fills'])->toHaveCount(1)
        ->and($report['proposal_sha256'])->toBe(hash('sha256', File::get($directory.'/bukhari.json')));
});

it('exits with a failure when the OpenITI file is missing', function (): void {
    gapsDecisionsFile([gapsEntry('3', 'unknown', 'none', '2', '4', null, null)]);

    $this->artisan('hadith:build-gaps', ['--collection' => ['bukhari'], '--openiti-dir' => gapsOpenItiDirectory().'/missing'])
        ->assertFailed();
});
