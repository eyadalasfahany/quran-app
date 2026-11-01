<?php

declare(strict_types=1);

use App\Domains\Azkar\Data\ImportReport;
use App\Domains\Azkar\Exceptions\CatalogueUnreadableException;
use App\Domains\Azkar\Services\AzkarImporter;
use App\Domains\Azkar\Sources\AzkarSourceRegistry;
use App\Domains\Azkar\Sources\HisnMuslimSource;
use App\Domains\Content\Models\AzkarChapter;
use App\Domains\Content\Models\AzkarEntry;
use App\Domains\Content\Models\ContentSource;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\File;

/*
| ADR 0031 §12. Placeholder snapshot only: every text is «نص تجريبي» or «عنوان تجريبي», never a dhikr. The snapshot
| directory is written under the testing storage and the pin is set in config for each test.
*/

uses(RefreshDatabase::class);

const HMSRC_DATE = '2001-02-03';

beforeEach(function (): void {
    Bus::fake();
    $sha = hmsrcWriteSnapshot(hmsrcDir(), HMSRC_DATE);
    config([
        'azkar.hisnmuslim.snapshot_date' => HMSRC_DATE,
        'azkar.hisnmuslim.snapshot_sha256' => $sha,
        'azkar.hisnmuslim.import_enabled' => false,
    ]);
});

afterEach(function (): void {
    File::deleteDirectory(storage_path('framework/testing/azkar-hm'));
    app()->detectEnvironment(fn (): string => 'testing');
});

function hmsrcDir(): string
{
    return storage_path('framework/testing/azkar-hm/fixture');
}

/**
 * @param  array<string, mixed>  $value
 */
function hmsrcBytes(array $value): string
{
    return "\xEF\xBB\xBF".json_encode($value, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
}

/**
 * Writes a placeholder snapshot with two chapters and three entries, and its manifest. Returns the manifest SHA-256.
 */
function hmsrcWriteSnapshot(string $dir, string $date, ?string $repeatOfEntryTwo = null): string
{
    File::ensureDirectoryExists($dir);

    $index = ['العربية' => [
        ['ID' => 1, 'TITLE' => '«عنوان تجريبي ١»', 'AUDIO_URL' => '', 'TEXT' => ''],
        ['ID' => 2, 'TITLE' => '«عنوان تجريبي ٢»', 'AUDIO_URL' => '', 'TEXT' => ''],
    ]];
    $entry = fn (int $id, int $repeat): array => ['ID' => $id, 'ARABIC_TEXT' => '«نص تجريبي '.$id.' — ليس ذكرًا»', 'LANGUAGE_ARABIC_TRANSLATED_TEXT' => '', 'TRANSLATED_TEXT' => 'FIXTURE translation — not stored', 'REPEAT' => $repeat, 'AUDIO' => ''];
    $files = [
        'index.json' => hmsrcBytes($index),
        '1.json' => hmsrcBytes(['«عنوان تجريبي ١»' => [$entry(1, 3), $entry(2, $repeatOfEntryTwo === null ? 1 : (int) $repeatOfEntryTwo)]]),
        '2.json' => hmsrcBytes(['«عنوان تجريبي ٢»' => [$entry(3, 1)]]),
    ];

    $hashes = [];

    foreach ($files as $name => $bytes) {
        File::put($dir.'/'.$name, $bytes);
        $hashes[$name] = hash('sha256', $bytes);
    }

    ksort($hashes);
    $sha = hash('sha256', json_encode($hashes, JSON_THROW_ON_ERROR));

    File::put($dir.'/manifest.json', json_encode(['source' => 'hisnmuslim', 'date' => $date, 'files' => $hashes, 'sha256' => $sha], JSON_THROW_ON_ERROR));

    return $sha;
}

it('the registry resolves both sources and refuses an unknown one', function (): void {
    $registry = app(AzkarSourceRegistry::class);

    expect($registry->codes())->toBe(['opendua', 'hisnmuslim'])
        ->and($registry->for('hisnmuslim')->profile()->collectionId)->toBe('hisn-al-muslim-hm')
        ->and($registry->primaryCode())->toBe('opendua')
        ->and(fn () => $registry->for('unknown'))->toThrow(InvalidArgumentException::class);
});

it('parses a snapshot into the catalogue shape: entry keys, byte-exact Arabic chapter titles, REPEAT as times', function (): void {
    $parsed = app(HisnMuslimSource::class)->parse(hmsrcDir());

    expect($parsed->data['dataVersion'])->toBe(HMSRC_DATE)
        ->and($parsed->data['chapters'][0]['titleAr'])->toBe('«عنوان تجريبي ١»')
        ->and($parsed->data['chapters'][0]['title'])->toBe('')
        ->and($parsed->data['entries'][0]['id'])->toBe('1')
        ->and($parsed->data['entries'][0]['collectionId'])->toBe('hisn-al-muslim-hm')
        ->and($parsed->data['entries'][0]['variations'][0]['steps'][0]['items'][0]['times'])->toBe(3)
        ->and($parsed->data['entries'][0]['variations'][0]['steps'][0]['items'][0]['dua'])->not->toHaveKey('translation')
        ->and($parsed->data['counts'])->toBe(['collections' => 1, 'chapters' => 2, 'entries' => 3, 'duas' => 3, 'recordings' => 0]);
});

it('refuses a snapshot file that no longer matches its manifest', function (): void {
    File::put(hmsrcDir().'/2.json', hmsrcBytes(['«عنوان تجريبي ٢»' => [['ID' => 3, 'ARABIC_TEXT' => 'changed', 'REPEAT' => 1]]]));

    expect(fn () => app(HisnMuslimSource::class)->parse(hmsrcDir()))
        ->toThrow(CatalogueUnreadableException::class);

    try {
        app(HisnMuslimSource::class)->parse(hmsrcDir());
    } catch (CatalogueUnreadableException $exception) {
        expect($exception->issueCode)->toBe('snapshot_file_mismatch');
    }
});

it('dry-runs the snapshot with the pin, and reports the chapters with their Arabic titles', function (): void {
    $report = app(AzkarImporter::class)->run(hmsrcDir(), true, false, false, 'hisnmuslim');

    expect($report->status)->toBe(ImportReport::STATUS_VALID)
        ->and($report->source['source'])->toBe('hisnmuslim')
        ->and($report->content['entries_imported'])->toBe(3)
        ->and($report->content['chapters_imported'])->toBe(2)
        ->and($report->errors())->toBe([]);
});

it('blocks only the entry whose REPEAT is not a positive integer', function (): void {
    hmsrcWriteSnapshotAndPin(hmsrcDir(), '0');

    $report = app(AzkarImporter::class)->run(hmsrcDir(), true, false, true, 'hisnmuslim');

    expect($report->status)->toBe(ImportReport::STATUS_VALID)
        ->and(array_column($report->errors(), 'code'))->toContain('invalid_times')
        ->and($report->content['skipped'][0]['entry'])->toBe('hisn-al-muslim-hm:2');
});

/**
 * Rewrites the snapshot with a changed REPEAT and pins the new manifest, for the blocked-entry test.
 */
function hmsrcWriteSnapshotAndPin(string $dir, string $repeat): void
{
    $sha = hmsrcWriteSnapshot($dir, HMSRC_DATE, $repeat);
    config(['azkar.hisnmuslim.snapshot_sha256' => $sha]);
}

it('stays locked while its import flag is off, and while its source is pending', function (): void {
    $report = app(AzkarImporter::class)->run(hmsrcDir(), false, false, false, 'hisnmuslim');

    expect($report->status)->toBe(ImportReport::STATUS_LOCKED)
        ->and(implode(' ', $report->lockReasons))->toContain('AZKAR_HISNMUSLIM_IMPORT_ENABLED')
        ->and(implode(' ', $report->lockReasons))->toContain('[pending]');
});

it('writes its own azkar resource and its rows once both locks are open, and keeps the hisn entry keys', function (): void {
    config(['azkar.hisnmuslim.import_enabled' => true]);
    ContentSource::query()->where('code', 'hisnmuslim')->update(['permission_status' => 'granted']);

    $report = app(AzkarImporter::class)->run(hmsrcDir(), false, false, false, 'hisnmuslim');

    expect($report->status)->toBe(ImportReport::STATUS_IMPORTED)
        ->and(AzkarEntry::query()->where('entry_key', 'hisn-al-muslim-hm:1')->exists())->toBeTrue()
        ->and(AzkarChapter::query()->where('number', 2)->value('title_ar'))->toBe('«عنوان تجريبي ٢»')
        ->and(AzkarChapter::query()->where('number', 1)->value('title_en'))->toBeNull();
});

it('the import command takes --source=hisnmuslim and dry-runs the given snapshot', function (): void {
    $this->artisan('azkar:import', ['path' => hmsrcDir(), '--dry-run' => true, '--source' => 'hisnmuslim', '--report' => storage_path('framework/testing/azkar-hm/report.json')])
        ->assertExitCode(0);
});

it('the import command refuses an unknown source', function (): void {
    $this->artisan('azkar:import', ['path' => hmsrcDir(), '--dry-run' => true, '--source' => 'nope'])
        ->assertExitCode(1);
});

it('the local unlock command changes the hisnmuslim row only with --source, and only locally', function (): void {
    ContentSource::query()->where('code', 'opendua')->update(['permission_status' => 'pending']);

    $this->artisan('azkar:source-permission', ['status' => 'granted', '--source' => 'hisnmuslim'])->assertExitCode(0);

    expect(ContentSource::query()->where('code', 'hisnmuslim')->value('permission_status')?->value)->toBe('granted')
        ->and(ContentSource::query()->where('code', 'opendua')->value('permission_status')?->value)->toBe('pending');

    app()->detectEnvironment(fn (): string => 'production');

    $this->artisan('azkar:source-permission', ['status' => 'granted', '--source' => 'hisnmuslim'])->assertExitCode(1);

    app()->detectEnvironment(fn (): string => 'testing');

    expect(ContentSource::query()->where('code', 'hisnmuslim')->value('permission_status')?->value)->toBe('granted');
});

it('gives each hisnmuslim entry the browse tags of its chapter number, from the chapter map', function (): void {
    config(['azkar_chapter_tags' => [1 => ['fixture-tag-a'], 2 => []]]);

    $parsed = app(HisnMuslimSource::class)->parse(hmsrcDir());

    expect($parsed->data['entries'][0]['tags'])->toBe(['fixture-tag-a'])
        ->and($parsed->data['entries'][2]['tags'])->toBe([])
        ->and(array_column($parsed->data['tags'], 'id'))->toBe(['fixture-tag-a']);
});

it('the candidate command routes to hisnmuslim: its pin, its collection, its own map file', function (): void {
    $output = storage_path('framework/testing/azkar-hm/map.php');

    $this->artisan('azkar:quran-map-candidates', ['path' => hmsrcDir(), '--source' => 'hisnmuslim', '--output' => $output])
        ->assertExitCode(0);

    expect(File::exists($output))->toBeTrue()
        ->and(require $output)->toBe([]);
});
