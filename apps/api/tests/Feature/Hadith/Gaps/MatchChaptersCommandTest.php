<?php

declare(strict_types=1);

use App\Domains\Hadith\Console\MatchChaptersCommand;
use Illuminate\Console\Scheduling\Schedule;
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
| hadith:match-chapters as a command (ADR 0076 §5, step 6b.7). The storage path is a temporary folder per test. Placeholder only.
*/

beforeEach(function (): void {
    Http::preventStrayRequests();
    Storage::fake('local');
    config(['hadith.title_match.request_gap_ms' => 0, 'hadith.extra_books' => []]);
    hadithImportUse(gapsFawazahmedFixture());
    hadithImportWarm();
    app()->useStoragePath(storage_path('framework/testing/hadith-match-storage-'.getmypid()));
});

afterEach(function (): void {
    File::deleteDirectory(storage_path('framework/testing/hadith-match-storage-'.getmypid()));
    File::deleteDirectory(gapsOpenItiDirectory());
    File::deleteDirectory((string) config('content_sources.cache_root'));
});

it('has no --output option and defaults to the four collections', function (): void {
    $options = array_keys(Artisan::all()['hadith:match-chapters']->getDefinition()->getOptions());

    expect($options)->toContain('collection', 'openiti-dir', 'partial-books')
        ->and(in_array('output', $options, true))->toBeFalse();
});

it('refuses to run in production before any file is read', function (): void {
    app()['env'] = 'production';

    $this->artisan('hadith:match-chapters', ['--openiti-dir' => gapsOpenItiDirectory()])
        ->expectsOutputToContain('disabled in production')
        ->assertExitCode(1);
});

it('refuses a source file whose SHA-256 differs from the pin', function (): void {
    File::ensureDirectoryExists(gapsOpenItiDirectory());
    File::put(gapsOpenItiDirectory().'/'.basename((string) config('hadith.openiti.files.bukhari.path')), "#META#Header#End#\n### | 1 - FIXTURE\n");

    $this->artisan('hadith:match-chapters', ['--collection' => ['bukhari'], '--openiti-dir' => gapsOpenItiDirectory()])
        ->expectsOutputToContain('differs from its pin')
        ->assertFailed();
});

it('refuses a --partial-books value other than drop or keep', function (): void {
    $this->artisan('hadith:match-chapters', ['--openiti-dir' => gapsOpenItiDirectory(), '--partial-books' => 'maybe'])
        ->assertFailed();
});

it('writes the proposal and report only under storage/app/hadith/proposals/chapters', function (): void {
    $this->artisan('hadith:match-chapters', ['--collection' => ['bukhari'], '--openiti-dir' => gapsOpenItiDirectory()])
        ->assertFailed();

    expect(File::exists(storage_path('app/hadith/proposals/chapters/bukhari.json')))->toBeFalse()
        ->and(File::exists(storage_path('app/hadith/proposals/gaps')))->toBeFalse();
});

it('is not scheduled and release.sh does not mention it', function (): void {
    $events = collect(app(Schedule::class)->events())->map(fn ($event): string => (string) $event->command);

    expect($events->filter(fn (string $command): bool => str_contains($command, 'hadith:match-chapters'))->all())->toBe([])
        ->and(file_get_contents(base_path('docker/release.sh')))->not->toContain('hadith:match-chapters')
        ->and(MatchChaptersCommand::class)->toBeString();
});
