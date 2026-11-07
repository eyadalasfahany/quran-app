<?php

declare(strict_types=1);

use App\Integrations\HadithApiCom\HadithApiComClient;
use App\Integrations\HadithApiCom\HadithApiComConfig;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Factory;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;

require_once __DIR__.'/../Support/HadithFixtureFiles.php';
require_once __DIR__.'/../Support/HadithImportFixtures.php';
require_once __DIR__.'/../Support/HadithTitleMatchFixtures.php';

/*
| hadith:match-section-titles (dev only, ADR 0042 §4a). Faked hadithapi.com and the fake CDN; a temporary cache and output.
*/

const HADITH_MATCH_CMD_KEY = 'FIXTURE-KEY';

beforeEach(function (): void {
    Http::preventStrayRequests();
    config(['hadith.range_corrections' => []]);
    hadithImportUse(hadithImportFiles());
    hadithImportWarm();
    config([
        'hadith.api_key' => HADITH_MATCH_CMD_KEY,
        'hadith.title_match.retry_delay_ms' => 0,
    ]);
    app()->forgetInstance(HadithApiComConfig::class);
    app()->forgetInstance(HadithApiComClient::class);
});

afterEach(function (): void {
    app()['env'] = 'testing';
    File::deleteDirectory((string) config('content_sources.cache_root'));
    File::delete(hadithMatchOutputPath());
});

function hadithMatchOutputPath(): string
{
    return storage_path('framework/testing/hadith-section-titles-test.json');
}

function hadithMatchRun(array $arguments): int
{
    return Artisan::call('hadith:match-section-titles', $arguments);
}

it('refuses to run in production even with a key, before any request or file', function (): void {
    app()['env'] = 'production';
    hadithMatchFake(...hadithMatchDefault());

    $code = hadithMatchRun(['--output' => hadithMatchOutputPath()]);

    expect($code)->toBe(1)
        ->and(Artisan::output())->toContain('disabled in production');

    Http::assertNothingSent();
    expect(File::exists(hadithMatchOutputPath()))->toBeFalse();
});

it('refuses without a key and names HADITH_API_KEY', function (): void {
    config(['hadith.api_key' => null]);

    expect(hadithMatchRun(['--output' => hadithMatchOutputPath()]))->toBe(1)
        ->and(Artisan::output())->toContain('HADITH_API_KEY');
});

it('processes only the shared collections and lists the others as skipped', function (): void {
    hadithMatchFake(...hadithMatchDefault());

    expect(hadithMatchRun(['--collection' => ['malik', 'nawawi40'], '--output' => hadithMatchOutputPath()]))->toBe(0);

    $proposal = json_decode(File::get(hadithMatchOutputPath()), true, flags: JSON_THROW_ON_ERROR);

    expect($proposal['skipped'])->toBe(['malik' => ['reason' => 'no counterpart'], 'nawawi40' => ['reason' => 'no counterpart']])
        ->and($proposal['collections'])->toBe([]);
    Http::assertNothingSent();
});

it('lists every accepted and rejected match with both percentages and the counts', function (): void {
    hadithMatchFake(...hadithMatchDefault());

    expect(hadithMatchRun(['--collection' => ['bukhari'], '--output' => hadithMatchOutputPath()]))->toBe(0);

    $proposal = json_decode(File::get(hadithMatchOutputPath()), true, flags: JSON_THROW_ON_ERROR);
    $bukhari = $proposal['collections']['bukhari'];

    expect($bukhari['book_slug'])->toBe('sahih-bukhari')
        ->and($bukhari['accepted']['1']['forward'])->toBe(['matched' => 2, 'total' => 2, 'percent' => 100.0])
        ->and($bukhari['accepted']['1']['backward'])->toBe(['matched' => 2, 'total' => 2, 'percent' => 100.0])
        ->and($bukhari['rejected']['2']['reason'])->toBe('no_chapter_mapped')
        ->and($bukhari['sections'])->toBe(4)
        ->and($bukhari['hadithapi_chapters'])->toBe(3)
        ->and($bukhari['hadithapi_hadith'])->toBe(3);
});

it('writes the title byte for byte, and only titles and statistics', function (): void {
    hadithMatchFake(...hadithMatchDefault());

    hadithMatchRun(['--collection' => ['bukhari'], '--output' => hadithMatchOutputPath()]);

    $raw = File::get(hadithMatchOutputPath());
    $proposal = json_decode($raw, true, flags: JSON_THROW_ON_ERROR);

    expect($proposal['collections']['bukhari']['accepted']['1']['title_ar'] === "FIXTURE chapter title 1\u{200F} ")->toBeTrue()
        ->and($raw)->not->toContain('FIXTURE text')
        ->and($raw)->not->toContain('نص تجريبي')
        ->and($raw)->not->toContain('FIXTURE grade')
        ->and($raw)->not->toContain('grades')
        ->and($raw)->not->toContain('apiKey')
        ->and($raw)->not->toContain('https://')
        ->and($raw)->not->toContain(HADITH_MATCH_CMD_KEY);
});

it('writes a paste block in the hadith_titles sections shape', function (): void {
    hadithMatchFake(...hadithMatchDefault());

    hadithMatchRun(['--collection' => ['bukhari'], '--output' => hadithMatchOutputPath()]);

    $proposal = json_decode(File::get(hadithMatchOutputPath()), true, flags: JSON_THROW_ON_ERROR);

    expect($proposal['paste']['bukhari']['1'])->toHaveKeys(['title_ar', 'title_ar_source'])
        ->and($proposal['paste']['bukhari']['1']['title_ar_source'])->toBe('hadithapi.com');
});

it('never writes config/', function (): void {
    $titles = md5_file(config_path('hadith_titles.php'));
    $hadith = md5_file(config_path('hadith.php'));
    hadithMatchFake(...hadithMatchDefault());

    hadithMatchRun(['--collection' => ['bukhari'], '--output' => hadithMatchOutputPath()]);

    expect(md5_file(config_path('hadith_titles.php')))->toBe($titles)
        ->and(md5_file(config_path('hadith.php')))->toBe($hadith);
});

it('never shows the key in output, the proposal or a log, after a server error', function (): void {
    $log = storage_path('framework/testing/hadith-match-cmd-'.bin2hex(random_bytes(4)).'.log');
    config(['logging.default' => 'single', 'logging.channels.single.path' => $log]);
    hadithMatchFake(...hadithMatchDefault(), failingBooks: ['sahih-bukhari']);

    $code = hadithMatchRun(['--collection' => ['bukhari'], '--output' => hadithMatchOutputPath()]);
    $output = Artisan::output();

    expect($code)->toBe(1)
        ->and($output)->not->toContain(HADITH_MATCH_CMD_KEY)
        ->and($output)->toContain('HTTP 500');

    expect(! File::exists($log) || ! str_contains(File::get($log), HADITH_MATCH_CMD_KEY))->toBeTrue();

    File::delete($log);
});

it('never shows the key after a connection error that carries the URL', function (): void {
    Http::swap(new Factory);
    Http::preventStrayRequests();
    Http::fake(function (): void {
        throw new ConnectionException('cURL error 28: https://hadithapi.com/api/sahih-bukhari/chapters?apiKey='.HADITH_MATCH_CMD_KEY);
    });

    $code = hadithMatchRun(['--collection' => ['bukhari'], '--output' => hadithMatchOutputPath()]);

    expect($code)->toBe(1)
        ->and(Artisan::output())->not->toContain(HADITH_MATCH_CMD_KEY)
        ->and(File::exists(hadithMatchOutputPath()))->toBeFalse();
});

it('writes nothing when one collection fails', function (): void {
    hadithMatchFake(...[...hadithMatchDefault(), 'failingBooks' => ['sahih-muslim']]);

    $code = hadithMatchRun(['--collection' => ['bukhari', 'muslim'], '--output' => hadithMatchOutputPath()]);

    expect($code)->toBe(1)
        ->and(File::exists(hadithMatchOutputPath()))->toBeFalse();
});

it('is not scheduled and not in release.sh or start-web.sh', function (): void {
    $events = collect(app(Schedule::class)->events())->map(fn ($event): string => (string) $event->command);

    expect($events->filter(fn (string $command): bool => str_contains($command, 'hadith:'))->all())->toBe([])
        ->and(file_get_contents(base_path('docker/release.sh')))->not->toContain('hadith:')
        ->and(file_get_contents(base_path('docker/start-web.sh')))->not->toContain('hadith:');
});
