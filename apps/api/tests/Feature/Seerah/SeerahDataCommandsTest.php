<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Tests\Support\SeerahFixture;

// The real configuration is used here (no fixture batches). The committed data is skeletons (no event yet), so the structure run is green and the release run is red. Placeholder fixtures
// are used wherever a command reads another file (--source, --data); no test prints book text.

/**
 * A fingerprint of every file under a folder, to prove a command did not write there.
 */
function seerahFolderFingerprint(string $directory): string
{
    $parts = [];

    foreach (File::allFiles($directory) as $file) {
        $parts[] = $file->getRelativePathname().':'.hash_file('sha256', $file->getPathname());
    }

    sort($parts);

    return hash('sha256', implode("\n", $parts));
}

it('runs the format check and the structure validation green on the committed data', function (): void {
    $this->artisan('seerah:fmt', ['--check' => true])->assertExitCode(0);
    $this->artisan('seerah:validate', ['--structure' => true])->assertExitCode(0);
});

it('fails release mode on the committed skeletons, and refuses two modes at once', function (): void {
    $this->artisan('seerah:validate', ['--release' => true])->assertExitCode(1);
    $this->artisan('seerah:validate', ['--structure' => true, '--release' => true])->assertExitCode(1);
});

it('fails the counts check when a pinned count changes without a pin edit (V19)', function (): void {
    config(['seerah.counts.places' => 3]);

    $this->artisan('seerah:validate')->assertExitCode(1);
});

it('refuses to sign in a non-interactive run and in CI, and writes no sign-off', function (): void {
    $before = seerahFolderFingerprint(database_path('data/seerah'));

    $this->artisan('seerah:approve', ['group' => 'E1', '--no-interaction' => true])->assertExitCode(1);

    putenv('CI=true');

    try {
        $this->artisan('seerah:approve', ['group' => 'E1'])->assertExitCode(1);
    } finally {
        putenv('CI');
    }

    expect(seerahFolderFingerprint(database_path('data/seerah')))->toBe($before)
        ->and(is_file(database_path('data/seerah/reviews/E1.json')))->toBeFalse();
});

it('writes the report outside the data folder and leaves the data untouched', function (): void {
    $before = seerahFolderFingerprint(database_path('data/seerah'));
    $out = SeerahFixture::directory().'/index.html';

    $this->artisan('seerah:report', ['--out' => $out])->assertExitCode(0);

    expect(is_file($out))->toBeTrue()
        ->and(seerahFolderFingerprint(database_path('data/seerah')))->toBe($before)
        ->and((string) File::get($out))->toContain('dir="rtl"');
});

it('finds a term in the book text and reports its offsets, without changing the text', function (): void {
    $source = SeerahFixture::directory().'/source.mARkdown';
    file_put_contents($source, SeerahFixture::source());

    $this->artisan('seerah:find', ['term' => 'مدينة تجريبية', '--source' => $source])
        ->expectsOutputToContain('p00001')
        ->expectsOutputToContain('3 match(es); printed 3.')
        ->assertExitCode(0);
});

it('prints the exact quote from a paragraph and its evidence snippet', function (): void {
    $source = SeerahFixture::directory().'/source.mARkdown';
    file_put_contents($source, SeerahFixture::source());

    expect(Artisan::call('seerah:quote', ['para' => 'p00002', 'from' => 'مدينة', 'to' => 'تجريبية', '--source' => $source]))->toBe(0);

    $output = Artisan::output();

    expect($output)->toStartWith("مدينة تجريبية\n")
        ->and($output)->toContain('"para": "p00002"')
        ->and($output)->toContain('"quote": "مدينة تجريبية"');

    expect(Artisan::call('seerah:quote', ['para' => 'p00002', 'from' => 'مدينة', 'to' => 'غائب', '--source' => $source]))->toBe(1)
        ->and(Artisan::call('seerah:quote', ['para' => 'p09999', 'from' => 'مدينة', 'to' => 'تجريبية', '--source' => $source]))->toBe(1);
});

it('writes the draft skeleton of a batch once, and refuses to write over curated events', function (): void {
    $data = SeerahFixture::directory().'/data';
    File::ensureDirectoryExists($data.'/events');
    File::put($data.'/events/E1.json', json_encode(['format' => 1, 'batch' => 'E1', 'period' => 'Makkah before the Bi\'tha', 'events' => []], JSON_THROW_ON_ERROR));

    $this->artisan('seerah:skeleton', ['batch' => 'E1', '--data' => $data])
        ->expectsOutputToContain('Wrote 17 draft event(s)')
        ->assertExitCode(0);

    $written = json_decode((string) File::get($data.'/events/E1.json'), true, flags: JSON_THROW_ON_ERROR);

    expect($written['events'])->toHaveCount(17)
        ->and($written['events'][0]['id'])->toBe('e003')
        ->and($written['events'][0]['place'])->toBeNull();

    $this->artisan('seerah:skeleton', ['batch' => 'E1', '--data' => $data])->assertExitCode(1);
});

it('lists place candidates as a worklist without writing anything', function (): void {
    $source = SeerahFixture::directory().'/source.mARkdown';
    file_put_contents($source, SeerahFixture::source());

    $this->artisan('seerah:place-candidates', ['--source' => $source, '--limit' => 5])->assertExitCode(0);
});
