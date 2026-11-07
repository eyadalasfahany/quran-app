<?php

declare(strict_types=1);

use App\Domains\Hadith\Console\MatchBookTitlesCommand;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;

/*
| hadith:match-book-titles as a command (ADR 0042 §4a, ADR 0076). It refuses before reading anything, never writes config/, and
| writes only under storage/app/hadith/proposals. Placeholder only.
*/

beforeEach(function (): void {
    $this->titlesPath = config_path('hadith_titles.php');
    $this->titlesHash = hash_file('sha256', $this->titlesPath);
    app()->useStoragePath(storage_path('framework/testing/book-titles-'.getmypid()));
});

afterEach(function (): void {
    app()['env'] = 'testing';
    File::deleteDirectory(storage_path('framework/testing/book-titles-'.getmypid()));
});

it('has the collection and openiti-dir options and no output option', function (): void {
    $options = array_keys(Artisan::all()['hadith:match-book-titles']->getDefinition()->getOptions());

    expect($options)->toContain('collection', 'openiti-dir')
        ->and(in_array('output', $options, true))->toBeFalse()
        ->and(MatchBookTitlesCommand::class)->toBeString();
});

it('refuses to run in production before any file is read', function (): void {
    app()['env'] = 'production';

    $this->artisan('hadith:match-book-titles', ['--openiti-dir' => '/nonexistent-fixture-folder'])
        ->expectsOutputToContain('disabled in production')
        ->assertExitCode(1);
});

it('refuses an unknown collection', function (): void {
    $this->artisan('hadith:match-book-titles', ['--collection' => ['not-a-collection'], '--openiti-dir' => '/nonexistent-fixture-folder'])
        ->expectsOutputToContain('Unknown collection')
        ->assertFailed();
});

it('refuses a missing OpenITI file and never writes config/', function (): void {
    $this->artisan('hadith:match-book-titles', ['--collection' => ['bukhari'], '--openiti-dir' => '/nonexistent-fixture-folder'])
        ->expectsOutputToContain('missing in the given folder')
        ->assertFailed();

    expect(hash_file('sha256', $this->titlesPath))->toBe($this->titlesHash)
        ->and(File::exists(storage_path('app/hadith/proposals/book-titles.json')))->toBeFalse();
});
