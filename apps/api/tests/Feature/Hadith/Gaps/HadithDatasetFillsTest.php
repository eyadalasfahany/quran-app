<?php

declare(strict_types=1);

use App\Domains\Hadith\Exceptions\HadithDataFileException;
use App\Domains\Hadith\Exceptions\HadithGapBuildException;
use App\Domains\Hadith\Overlay\HadithDataFiles;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

require_once __DIR__.'/../Support/HadithFixtureFiles.php';
require_once __DIR__.'/../Support/HadithImportFixtures.php';
require_once __DIR__.'/../Support/HadithGapFixtures.php';

/*
| hadith:build-gaps fills from the Sunnah.com-derived datasets (ADR 0076, gap-report extension): the record is located by
| its anchor on the previous hadith, read from a pinned file under storage/framework/testing, and stored exactly as received.
| Placeholder text only; no test touches storage/app/private/sources or database/data/hadith.
*/

const DATASET_FILE = 'FIXTURE dataset.json';

beforeEach(function (): void {
    Http::preventStrayRequests();
    Storage::fake('local');
    config(['hadith.title_match.request_gap_ms' => 0, 'hadith.extra_books' => []]);
    hadithImportUse(gapsFawazahmedFixture());
    hadithImportWarm();
    gapsOpenItiFile(gapsStandardUnits());
});

afterEach(function (): void {
    File::deleteDirectory(gapsDataDirectory());
    File::deleteDirectory(gapsOpenItiDirectory());
    File::deleteDirectory(datasetsDirectory());
    File::deleteDirectory((string) config('content_sources.cache_root'));
});

function datasetsDirectory(): string
{
    return storage_path('framework/testing/hadith-datasets-'.getmypid());
}

/**
 * The placeholder records of a dataset file: record 1 matches hadith 2, record 2 is the gap, record 3 matches hadith 4.
 *
 * @return list<array<string, string>>
 */
function datasetRecords(?string $gapText = null): array
{
    return [
        ['Reference' => 'https://placeholder.example/1', 'Arabic_Text' => GAP_TEXT_1],
        ['Reference' => 'https://placeholder.example/2', 'Arabic_Text' => GAP_TEXT_2],
        ['Reference' => 'https://placeholder.example/3', 'Arabic_Text' => $gapText ?? GAP_TEXT_GAP],
        ['Reference' => 'https://placeholder.example/4', 'Arabic_Text' => GAP_TEXT_4],
    ];
}

/**
 * Writes the placeholder dataset file under the testing folder and configures origin meeatif for collection bukhari.
 *
 * @param  list<array<string, string>>  $records
 */
function datasetsUse(array $records, ?string $pin = null, bool $pinned = true): void
{
    File::ensureDirectoryExists(datasetsDirectory());
    $bytes = json_encode($records, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)."\n";
    File::put(datasetsDirectory().'/'.DATASET_FILE, $bytes);

    config(['hadith.datasets' => ['meeatif' => [
        'source' => 'meeAtif/hadith_datasets',
        'revision' => str_repeat('c', 40),
        'dir' => 'framework/testing/hadith-datasets-'.getmypid(),
        'files' => [DATASET_FILE => $pinned ? ($pin ?? hash('sha256', $bytes)) : null],
        'collections' => ['bukhari' => DATASET_FILE],
        'record' => ['list' => null, 'text' => 'Arabic_Text'],
    ]]]);
}

/**
 * @return array<string, mixed>
 */
function datasetEntry(string $hadith = '3', string $class = 'fill-safe'): array
{
    return gapsEntry($hadith, $class, 'meeAtif/hadith_datasets', '2', '4');
}

it('fills a gap from the dataset record after the anchor, exactly as the dataset has it', function (): void {
    datasetsUse(datasetRecords());
    gapsDecisionsFile([datasetEntry()]);

    $proposal = gapsProposal(gapsBuild());

    expect($proposal['fills'])->toHaveCount(1)
        ->and($proposal['fills'][0]['origin'])->toBe('meeatif')
        ->and($proposal['fills'][0]['source_key'])->toBe('meeatif:bukhari:3')
        ->and($proposal['fills'][0]['text_ar'])->toBe(GAP_TEXT_GAP)
        ->and($proposal['fills'][0])->not->toHaveKey('unit')
        ->and($proposal['unresolved'])->toBe([])
        ->and($proposal['origins']['meeatif'])->toMatchArray([
            'source_version' => 'meeAtif/hadith_datasets@cccccccc',
            'revision' => str_repeat('c', 40),
            'file' => DATASET_FILE,
            'file_sha256' => hash_file('sha256', datasetsDirectory().'/'.DATASET_FILE),
        ]);
});

it('refuses a dataset file that has no SHA-256 pin', function (): void {
    datasetsUse(datasetRecords(), pinned: false);
    gapsDecisionsFile([datasetEntry()]);

    expect(fn (): object => gapsBuild())->toThrow(HadithGapBuildException::class, 'dataset_file_unpinned');
});

it('refuses a dataset file whose bytes differ from its pin', function (): void {
    datasetsUse(datasetRecords(), pin: str_repeat('a', 64));
    gapsDecisionsFile([datasetEntry()]);

    expect(fn (): object => gapsBuild())->toThrow(HadithGapBuildException::class, 'dataset_file_sha_mismatch');
});

it('lists a dataset fill whose text carries markup as unresolved, not as a fill', function (): void {
    datasetsUse(datasetRecords('<b>'.GAP_TEXT_GAP.'</b>'));
    gapsDecisionsFile([datasetEntry()]);

    $proposal = gapsProposal(gapsBuild());

    expect($proposal['fills'])->toBe([])
        ->and($proposal['unresolved'])->toBe([['number' => '3', 'reason' => 'dataset_text_markup']]);
});

it('lists a dataset fill whose next neighbour does not match as unresolved', function (): void {
    datasetsUse([
        ['Arabic_Text' => GAP_TEXT_1],
        ['Arabic_Text' => GAP_TEXT_2],
        ['Arabic_Text' => GAP_TEXT_GAP],
        ['Arabic_Text' => 'نص آخر ليس له علاقة بالجار'],
    ]);
    gapsDecisionsFile([datasetEntry()]);

    $proposal = gapsProposal(gapsBuild());

    expect($proposal['fills'])->toBe([])
        ->and($proposal['unresolved'])->toBe([['number' => '3', 'reason' => 'recheck_dataset_failed']]);
});

it('refuses a decision that names an unknown dataset source', function (): void {
    datasetsUse(datasetRecords());
    gapsDecisionsFile([gapsEntry('3', 'fill-safe', 'Unknown/dataset', '2', '4')]);

    expect(fn (): object => gapsBuild())->toThrow(HadithDataFileException::class, 'decision_source_unknown');
});

it('refuses a gaps file that names an origin outside the closed set', function (): void {
    $directory = datasetsDirectory();
    File::ensureDirectoryExists($directory.'/gaps');
    $document = [
        'schema_version' => 1,
        'collection' => 'bukhari',
        'generator' => 'hadith:build-gaps 1',
        'fawazahmed0_commit' => (string) config('hadith.commit'),
        'decisions_sha256' => str_repeat('0', 64),
        'origins' => ['mystery' => ['source_version' => 'FIXTURE version']],
        'books' => [],
        'fills' => [],
        'merges' => [],
        'unresolved' => [],
    ];
    $bytes = json_encode($document, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)."\n";
    File::put($directory.'/gaps/bukhari.json', $bytes);
    config(['hadith.data_files' => ['gaps/bukhari.json' => hash('sha256', $bytes)]]);
    app()->instance(HadithDataFiles::class, new HadithDataFiles($directory));

    expect(fn (): ?object => app(HadithDataFiles::class)->gaps('bukhari'))->toThrow(HadithDataFileException::class, 'origin_unknown');
});
