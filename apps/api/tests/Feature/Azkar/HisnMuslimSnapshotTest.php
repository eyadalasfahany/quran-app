<?php

declare(strict_types=1);

use App\Domains\Azkar\Exceptions\SnapshotException;
use App\Domains\Azkar\Sources\HisnMuslimSnapshotter;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;

/*
| ADR 0031 §12. Placeholder bytes only: every text is «نص تجريبي» or FIXTURE, never a dhikr. The snapshot date is a
| test date, so cleanup never touches a real snapshot.
*/

const HMS_DATE = '2001-02-03';

beforeEach(function (): void {
    config(['azkar.hisnmuslim.gap_ms' => 0, 'azkar.hisnmuslim.retry_delay_ms' => 0]);
    Http::preventStrayRequests();
});

afterEach(function (): void {
    File::deleteDirectory(storage_path('app/azkar/hisnmuslim/'.HMS_DATE));
});

/**
 * @param  array<string, mixed>  $value
 */
function hmsBytes(array $value): string
{
    return "\xEF\xBB\xBF".json_encode($value, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
}

function hmsFakeSource(): void
{
    Http::fake([
        'www.hisnmuslim.com/api/ar/husn_ar.json' => Http::response(hmsBytes(['العربية' => [
            ['ID' => 1, 'TITLE' => 'FIXTURE chapter one', 'AUDIO_URL' => '', 'TEXT' => ''],
            ['ID' => 2, 'TITLE' => 'FIXTURE chapter two', 'AUDIO_URL' => '', 'TEXT' => ''],
        ]])),
        'www.hisnmuslim.com/api/ar/1.json' => Http::response(hmsBytes(['FIXTURE chapter one' => [
            ['ID' => 1, 'ARABIC_TEXT' => 'FIXTURE text 1 — not a dhikr', 'LANGUAGE_ARABIC_TRANSLATED_TEXT' => '', 'TRANSLATED_TEXT' => '', 'REPEAT' => 3, 'AUDIO' => ''],
            ['ID' => 2, 'ARABIC_TEXT' => 'FIXTURE text 2 — not a dhikr', 'LANGUAGE_ARABIC_TRANSLATED_TEXT' => '', 'TRANSLATED_TEXT' => '', 'REPEAT' => 1, 'AUDIO' => ''],
        ]])),
        'www.hisnmuslim.com/api/ar/2.json' => Http::response(hmsBytes(['FIXTURE chapter two' => [
            ['ID' => 3, 'ARABIC_TEXT' => 'FIXTURE text 3 — not a dhikr', 'LANGUAGE_ARABIC_TRANSLATED_TEXT' => '', 'TRANSLATED_TEXT' => '', 'REPEAT' => 1, 'AUDIO' => ''],
        ]])),
    ]);
}

it('writes the index, every chapter and a manifest whose whole-file SHA-256 is the pin', function (): void {
    hmsFakeSource();

    $result = app(HisnMuslimSnapshotter::class)->take(HMS_DATE);

    $manifest = json_decode((string) File::get($result['directory'].'/manifest.json'), true, 512, JSON_THROW_ON_ERROR);
    $files = $manifest['files'];
    ksort($files);

    expect($result['chapters'])->toBe(2)
        ->and($result['entries'])->toBe(3)
        ->and($result['files'])->toBe(3)
        ->and(File::exists($result['directory'].'/1.json'))->toBeTrue()
        ->and(File::exists($result['directory'].'/2.json'))->toBeTrue()
        ->and($manifest['sha256'])->toBe(hash('sha256', json_encode($files, JSON_THROW_ON_ERROR)))
        ->and($result['manifest_sha256'])->toBe($manifest['sha256']);
});

it('stores the bytes as received, byte order mark included', function (): void {
    hmsFakeSource();

    $result = app(HisnMuslimSnapshotter::class)->take(HMS_DATE);

    expect(str_starts_with((string) File::get($result['directory'].'/1.json'), "\xEF\xBB\xBF"))->toBeTrue();
});

it('refuses a chapter file that does not hold exactly one title, and writes no manifest', function (): void {
    Http::fake([
        'www.hisnmuslim.com/api/ar/husn_ar.json' => Http::response(hmsBytes(['العربية' => [['ID' => 1, 'TITLE' => 'FIXTURE']]])),
        'www.hisnmuslim.com/api/ar/1.json' => Http::response(hmsBytes(['one' => [], 'two' => []])),
    ]);

    expect(fn () => app(HisnMuslimSnapshotter::class)->take(HMS_DATE))
        ->toThrow(SnapshotException::class, 'does not hold one title');

    expect(File::exists(storage_path('app/azkar/hisnmuslim/'.HMS_DATE.'/manifest.json')))->toBeFalse();
});

it('fails with nothing written when a file keeps answering with a server error', function (): void {
    Http::fake([
        'www.hisnmuslim.com/api/ar/husn_ar.json' => Http::response('', 500),
    ]);

    expect(fn () => app(HisnMuslimSnapshotter::class)->take(HMS_DATE))
        ->toThrow(SnapshotException::class, 'did not answer');

    expect(File::exists(storage_path('app/azkar/hisnmuslim/'.HMS_DATE)))->toBeFalse();
});

it('the command prints the pin for config/azkar.php', function (): void {
    hmsFakeSource();

    $this->artisan('azkar:snapshot', ['source' => 'hisnmuslim', '--date' => HMS_DATE])
        ->expectsOutputToContain("'snapshot_date' => '".HMS_DATE."'")
        ->expectsOutputToContain('snapshot_sha256')
        ->assertExitCode(0);
});

it('the command refuses any source other than hisnmuslim', function (): void {
    $this->artisan('azkar:snapshot', ['source' => 'opendua'])
        ->assertExitCode(1);

    Http::assertNothingSent();
});
