<?php

declare(strict_types=1);

use App\Domains\Hadith\Sources\SnapshotStore;
use App\Support\Storage\SourceCache;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

require_once __DIR__.'/../Support/HadithFixtureFiles.php';

/*
| hadith:snapshot (ADR 0042 §4). Placeholder bytes, faked HTTP, a temporary cache: the real cache is never touched.
*/

beforeEach(function (): void {
    Http::preventStrayRequests();
    hadithUseTempCache();
    hadithReload();
});

afterEach(function (): void {
    File::deleteDirectory((string) config('content_sources.cache_root'));
    app()['env'] = 'testing';
});

/**
 * @return list<string>
 */
function snapshotRequestedPaths(): array
{
    $paths = [];

    foreach (Http::recorded() as [$request]) {
        $paths[] = Str::after($request->url(), '@'.hadithCommit().'/');
    }

    return $paths;
}

/**
 * @return list<string> The lines that print one pin, as the command prints them.
 */
function snapshotPinLines(string $output): array
{
    return array_values(array_filter(explode("\n", $output), fn (string $line): bool => str_contains($line, "' => '")));
}

it('refuses default mode while any pin is null, makes no request and tells the developer to use --record', function (): void {
    hadithSetPins(array_fill_keys(array_keys(hadithFixtureFiles()), null));
    hadithFakeCdn(hadithFixtureFiles());

    expect(Artisan::call('hadith:snapshot'))->toBe(1);

    expect(Artisan::output())->toContain('--record')->toContain('editions.json');
    Http::assertNothingSent();
});

it('records: downloads all twelve files without pins and prints the hash map', function (): void {
    $files = hadithFixtureFiles();
    hadithSetPins(array_fill_keys(array_keys($files), null));
    hadithFakeCdn($files);

    expect(Artisan::call('hadith:snapshot', ['--record' => true]))->toBe(0);

    $output = Artisan::output();
    $editionsHash = hash('sha256', $files['editions.json']);

    foreach (array_keys($files) as $path) {
        expect($output)->toContain($path);
    }

    expect($output)->toContain('sha256')
        ->toContain("'editions.json' => '".$editionsHash."',");

    foreach (array_keys($files) as $path) {
        expect(File::exists(SourceCache::path('hadith/'.hadithCommit().'/'.$path)))->toBeTrue();
    }

    Http::assertSentCount(12);
});

it('record mode never writes config', function (): void {
    $files = hadithFixtureFiles();
    hadithSetPins(array_fill_keys(array_keys($files), null));
    hadithFakeCdn($files);

    $before = hash_file('sha256', config_path('hadith.php'));

    Artisan::call('hadith:snapshot', ['--record' => true]);

    expect(hash_file('sha256', config_path('hadith.php')))->toBe($before);
});

it('record mode flags a changed pin', function (): void {
    $files = hadithFixtureFiles();
    $pins = array_map(fn (string $bytes): string => hash('sha256', $bytes), $files);
    $pins['info.json'] = str_repeat('0', 64);
    hadithSetPins($pins);
    hadithFakeCdn($files);

    expect(Artisan::call('hadith:snapshot', ['--record' => true]))->toBe(0);

    expect(Artisan::output())->toContain('DIFFERS')->toContain('differ from the recorded pin');
});

it('record mode is disabled in production', function (): void {
    $files = hadithFixtureFiles();
    hadithSetPins(array_fill_keys(array_keys($files), null));
    hadithFakeCdn($files);

    app()['env'] = 'production';

    expect(Artisan::call('hadith:snapshot', ['--record' => true]))->toBe(1);

    expect(Artisan::output())->toContain('disabled in production');
    Http::assertNothingSent();
});

it('verifies with recorded pins and prints the same map', function (): void {
    $files = hadithFixtureFiles();
    hadithPinFixtures($files);
    hadithFakeCdn($files);

    expect(Artisan::call('hadith:snapshot'))->toBe(0);

    $output = Artisan::output();

    expect($output)->toContain('[verified]');

    foreach ($files as $path => $bytes) {
        expect($output)->toContain("'".$path."' => '".hash('sha256', $bytes)."',");
    }
});

it('snapshot is stable: a second run uses the cache, makes no request and prints identical hashes', function (): void {
    $files = hadithFixtureFiles();
    hadithPinFixtures($files);
    hadithFakeCdn($files);

    Artisan::call('hadith:snapshot');
    $first = snapshotPinLines(Artisan::output());

    expect(Artisan::call('hadith:snapshot'))->toBe(0);

    $second = Artisan::output();

    expect(snapshotPinLines($second))->toBe($first)
        ->and($second)->toContain('[cached]');

    Http::assertSentCount(12);
});

it('stops on a pin mismatch, writes nothing for that file and exits 1', function (): void {
    $files = hadithFixtureFiles();
    hadithPinFixtures($files);
    hadithFakeCdn(array_merge($files, ['editions/ara-muslim.json' => 'FIXTURE different bytes']));

    expect(Artisan::call('hadith:snapshot'))->toBe(1);

    expect(Artisan::output())->toContain('do not match');
    expect(app(SnapshotStore::class)->has('editions/ara-muslim.json'))->toBeFalse();
});

it('stops when editions.json does not list an expected edition and downloads nothing else', function (): void {
    $files = hadithEditFixture(hadithFixtureFiles(), 'editions.json', function (array $data): array {
        unset($data['malik']);

        return $data;
    });
    hadithPinFixtures($files);
    hadithFakeCdn($files);

    expect(Artisan::call('hadith:snapshot'))->toBe(1);

    expect(Artisan::output())->toContain('edition [ara-malik]');
    Http::assertSentCount(1);
});

it('reports a 404 and exits 1', function (): void {
    $files = hadithFixtureFiles();
    hadithPinFixtures($files);
    unset($files['editions/ara-nasai.json']);
    hadithFakeCdn($files);

    expect(Artisan::call('hadith:snapshot'))->toBe(1);

    expect(Artisan::output())->toContain('editions/ara-nasai.json');
});

it('requests no ara-1 and no English edition', function (): void {
    $files = hadithFixtureFiles();
    hadithSetPins(array_fill_keys(array_keys($files), null));
    hadithFakeCdn($files);

    Artisan::call('hadith:snapshot', ['--record' => true]);

    foreach (snapshotRequestedPaths() as $path) {
        expect(str_ends_with($path, '1.json'))->toBeFalse();
        expect(str_contains($path, 'eng-'))->toBeFalse();
    }
});

it('prints no hadith text', function (): void {
    $files = hadithFixtureFiles();
    hadithSetPins(array_fill_keys(array_keys($files), null));
    hadithFakeCdn($files);

    Artisan::call('hadith:snapshot', ['--record' => true]);

    expect(Artisan::output())->not->toContain('FIXTURE text')->not->toContain('FIXTURE grade');
});

it('is registered and not scheduled', function (): void {
    expect(array_key_exists('hadith:snapshot', Artisan::all()))->toBeTrue();

    $scheduled = collect(app(Schedule::class)->events())
        ->contains(fn ($event): bool => str_contains((string) ($event->command ?? ''), 'hadith:snapshot'));

    expect($scheduled)->toBeFalse();
});
