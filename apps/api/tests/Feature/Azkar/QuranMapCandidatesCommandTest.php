<?php

declare(strict_types=1);

use Illuminate\Support\Facades\File;

/*
| Placeholder fixture only (ADR 0031 §9). The fixture spans hold «نص تجريبي», which matches no Tanzil verse, so the
| command must write them as unmatched. Nothing here is Quran or dhikr text.
*/

const QMC_ITEM = 'hisn-al-muslim:entry-000004:evening:1';

beforeEach(function (): void {
    config(['azkar.opendua.catalogue_sha256' => hash_file('sha256', qmcFixturePath())]);
});

afterEach(function (): void {
    File::deleteDirectory(storage_path('framework/testing/azkar-map'));
});

function qmcFixturePath(): string
{
    return base_path('tests/Fixtures/azkar/opendua-fixture.json');
}

function qmcOutput(string $name = 'map.php'): string
{
    $path = storage_path('framework/testing/azkar-map/'.$name);
    File::ensureDirectoryExists(dirname($path));

    return $path;
}

/**
 * @param  list<array<array-key, mixed>>  $spans
 */
function qmcWriteExisting(string $path, string $itemKey, array $spans): void
{
    $export = var_export([$itemKey => $spans], true);
    File::put($path, "<?php\n\ndeclare(strict_types=1);\n\nreturn ".$export.";\n");
}

it('writes one row per span with its status and evidence, and no text', function (): void {
    $output = qmcOutput();

    $this->artisan('azkar:quran-map-candidates', ['path' => qmcFixturePath(), '--output' => $output])
        ->assertExitCode(0);

    $rows = require $output;

    expect($rows)->toHaveKey(QMC_ITEM)
        ->and($rows[QMC_ITEM])->toHaveCount(2)
        ->and($rows[QMC_ITEM][0]['status'])->toBe('unmatched')
        ->and($rows[QMC_ITEM][1]['status'])->toBe('unmatched')
        ->and(File::get($output))->not->toMatch('/\p{Arabic}/u');
});

it('keeps a reviewed row exactly as it is and fills the other spans', function (): void {
    $output = qmcOutput('reviewed.php');
    qmcWriteExisting($output, QMC_ITEM, [
        [2, 255, null, 'status' => 'reviewed', 'evidence' => 'checked by developer'],
        [null, null, null, 'status' => 'unmatched', 'evidence' => 'no_match'],
    ]);

    $this->artisan('azkar:quran-map-candidates', ['path' => qmcFixturePath(), '--output' => $output])
        ->assertExitCode(0);

    $rows = require $output;

    expect($rows[QMC_ITEM][0])->toBe([2, 255, null, 'status' => 'reviewed', 'evidence' => 'checked by developer'])
        ->and($rows[QMC_ITEM][1]['status'])->toBe('unmatched');
});

it('keeps a reviewed item whole when its span count no longer matches', function (): void {
    $output = qmcOutput('conflict.php');
    $reviewed = [[2, 255, null, 'status' => 'reviewed', 'evidence' => 'checked by developer']];
    qmcWriteExisting($output, QMC_ITEM, $reviewed);

    $this->artisan('azkar:quran-map-candidates', ['path' => qmcFixturePath(), '--output' => $output])
        ->expectsOutputToContain('reviewed items kept whole')
        ->assertExitCode(0);

    expect(require $output)->toBe([QMC_ITEM => $reviewed]);
});

it('writes nothing when the catalogue does not match the pin', function (): void {
    config(['azkar.opendua.catalogue_sha256' => str_repeat('0', 64)]);
    $output = qmcOutput('pin.php');

    $this->artisan('azkar:quran-map-candidates', ['path' => qmcFixturePath(), '--output' => $output])
        ->assertExitCode(1);

    expect(File::exists($output))->toBeFalse();
});

it('writes nothing when the catalogue has a structural error', function (): void {
    $catalogue = json_decode((string) file_get_contents(qmcFixturePath()), true, 512, JSON_THROW_ON_ERROR);
    $catalogue['entries'][0]['chapterId'] = 'no-such-chapter';
    $path = storage_path('framework/testing/azkar-map/broken.json');
    File::ensureDirectoryExists(dirname($path));
    File::put($path, json_encode($catalogue, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
    config(['azkar.opendua.catalogue_sha256' => hash_file('sha256', $path)]);
    $output = qmcOutput('structural.php');

    $this->artisan('azkar:quran-map-candidates', ['path' => $path, '--output' => $output])
        ->expectsOutputToContain('structural errors')
        ->assertExitCode(1);

    expect(File::exists($output))->toBeFalse();
});

it('requires a path or --download', function (): void {
    $this->artisan('azkar:quran-map-candidates', ['--output' => qmcOutput('none.php')])
        ->assertExitCode(1);
});
