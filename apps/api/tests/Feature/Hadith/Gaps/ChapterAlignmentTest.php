<?php

declare(strict_types=1);

use App\Domains\Hadith\Exceptions\HadithDataFileException;
use App\Domains\Hadith\Import\Records\MappingResult;
use App\Domains\Hadith\Overlay\ChapterAlignment;
use App\Domains\Hadith\Overlay\HadithDataFiles;
use App\Domains\Hadith\Overlay\OpenItiChapter;
use App\Domains\Hadith\Overlay\OpenItiChapterReader;
use App\Domains\Hadith\Overlay\OpenItiChapterScan;
use App\Domains\Hadith\Overlay\OpenItiHeadingCleaner;
use App\Domains\Hadith\Overlay\OpenItiUnit;
use App\Domains\Hadith\Overlay\OpenItiUnitReader;
use App\Domains\Hadith\Services\HadithChapterMatcher;
use App\Domains\Hadith\Sources\Records\SourceSection;
use Illuminate\Support\Facades\File;

require_once __DIR__.'/../Support/HadithFixtureFiles.php';
require_once __DIR__.'/../Support/HadithImportFixtures.php';

/*
| The alignment of OpenITI units to fawazahmed0 numbers (step 6b.7, brief items 1 to 4). Placeholder words and placeholder titles
| only; no hadith text, no real headings.
*/

afterEach(function (): void {
    File::deleteDirectory(alignFixtureDirectory());
});

function alignFixtureDirectory(): string
{
    return storage_path('framework/testing/hadith-alignment-'.getmypid());
}

/** A placeholder word per entry number: distinct, Arabic letters, at least three letters. */
function alignFixtureWord(int $number): string
{
    return "\u{062B}".str_repeat("\u{0627}", $number)."\u{062C}";
}

/** A unit with its own printed number (which need not be a fawazahmed0 number) and its file-order index. */
function alignFixtureUnit(int $printed, int $index, string $text): OpenItiUnit
{
    $marker = '### | '.$printed.' - ';

    return new OpenItiUnit($printed, [$marker.$text], strlen($marker), $index, $index);
}

/** A mapping of entries 1..$to in book '1', each with its placeholder word. */
function alignFixtureMapping(int $to): MappingResult
{
    $hadiths = [];

    for ($number = 1; $number <= $to; $number++) {
        $hadiths[] = hadithImportHadith((string) $number, alignFixtureWord($number), '1');
    }

    return hadithImportMap(hadithImportRecord($hadiths, [new SourceSection('1', null, '1', (string) $to, null, null)]));
}

/**
 * @return array{decisions: list<array<string, mixed>>, proposal: array<string, mixed>, report: array<string, mixed>}
 */
function alignFixtureRun(MappingResult $mapping, array $chapters, ?ChapterAlignment $alignment): array
{
    $result = app(HadithChapterMatcher::class)->match('muslim', $mapping, $chapters, 0, ['unit_marker' => 0], 'keep', [
        'release' => '2023.1.8',
        'doi' => 'FIXTURE doi',
        'version_id' => 'FIXTURE version',
        'source_file_sha256' => str_repeat('2', 64),
        'licence' => 'FIXTURE licence',
    ], $alignment);

    return [
        'decisions' => $result->report['decisions'],
        'proposal' => json_decode($result->proposalJson, true, flags: JSON_THROW_ON_ERROR),
        'report' => $result->report,
    ];
}

/**
 * Writes an alignment file with the given header overrides into the test folder, pins it, and returns the reader.
 *
 * @param  array<string, mixed>  $overrides
 */
function alignFixtureWrite(array $overrides = [], string $slug = 'muslim', bool $pin = true): HadithDataFiles
{
    $header = array_merge([
        'collection' => $slug,
        'openiti_file' => 'FIXTURE openiti file',
        'openiti_sha256' => config('hadith.openiti.files.'.$slug.'.sha256'),
        'fawazahmed0_commit' => config('hadith.commit'),
        'method' => 'FIXTURE method',
        'unit_count' => 10,
        'units' => [
            ['unit' => 2, 'hadith' => '1', 'score' => 0.9],
            ['unit' => 7, 'hadith' => '2', 'score' => 0.8],
        ],
    ], $overrides);
    $bytes = json_encode($header, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)."\n";
    $directory = alignFixtureDirectory().'/chapters/alignment';
    File::ensureDirectoryExists($directory);
    File::put($directory.'/'.$slug.'.json', $bytes);

    config(['hadith.data_files' => $pin ? ['chapters/alignment/'.$slug.'.json' => hash('sha256', $bytes)] : []]);

    return new HadithDataFiles(alignFixtureDirectory());
}

function alignFixtureScan(string $bytes, string $unitStart, string $unitStop, ?string $chapterRx): OpenItiChapterScan
{
    return (new OpenItiChapterReader(new OpenItiUnitReader, new OpenItiHeadingCleaner))->scan($bytes, $unitStart, $unitStop, $chapterRx, null);
}

it('maps units through the alignment and accepts a chapter that same-number pairing rejects', function (): void {
    $mapping = alignFixtureMapping(3);
    $chapter = new OpenItiChapter(1, 'FIXTURE chapter title 1', false, [
        alignFixtureUnit(101, 10, alignFixtureWord(1)),
        alignFixtureUnit(102, 11, alignFixtureWord(2)),
        alignFixtureUnit(103, 12, alignFixtureWord(3)),
    ]);
    $alignment = new ChapterAlignment('muslim', [10 => '1', 11 => '2', 12 => '3']);

    $without = alignFixtureRun($mapping, [$chapter], null);
    $with = alignFixtureRun($mapping, [$chapter], $alignment);

    expect($without['decisions'][0]['result'])->toBe('no_listed_text')
        ->and($without['report']['alignment_units'])->toBeNull()
        ->and($with['decisions'][0]['result'])->toBe('accepted')
        ->and($with['decisions'][0]['n'])->toBe(3)
        ->and($with['proposal']['chapters'][0]['first'])->toBe('1')
        ->and($with['proposal']['chapters'][0]['last'])->toBe('3')
        ->and($with['report']['alignment_units'])->toBe(3);
});

it('counts a unit with no alignment entry as not listed', function (): void {
    $chapter = new OpenItiChapter(1, 'FIXTURE chapter title 1', false, [
        alignFixtureUnit(101, 10, alignFixtureWord(1)),
        alignFixtureUnit(102, 11, alignFixtureWord(2)),
        alignFixtureUnit(103, 12, alignFixtureWord(3)),
    ]);

    $run = alignFixtureRun(alignFixtureMapping(3), [$chapter], new ChapterAlignment('muslim', [10 => '1', 11 => '2']));

    expect($run['decisions'][0]['n'])->toBe(2)
        ->and($run['decisions'][0]['result'])->toBe('accepted');
});

it('checks the forward text against the aligned entry, not the printed number', function (): void {
    $chapter = new OpenItiChapter(1, 'FIXTURE chapter title 1', false, [alignFixtureUnit(101, 10, alignFixtureWord(1))]);

    $run = alignFixtureRun(alignFixtureMapping(2), [$chapter], new ChapterAlignment('muslim', [10 => '2']));

    expect($run['decisions'][0]['result'])->toBe('forward_below_threshold');
});

it('reads a pinned alignment and maps each unit index to its number', function (): void {
    $dataFiles = alignFixtureWrite();

    $alignment = $dataFiles->alignment('muslim');

    expect($alignment)->toBeInstanceOf(ChapterAlignment::class)
        ->and($alignment->count())->toBe(2)
        ->and($alignment->numberOf(2))->toBe('1')
        ->and($alignment->numberOf(7))->toBe('2')
        ->and($alignment->numberOf(3))->toBeNull();
});

it('returns null when no alignment file exists, and when the file is not pinned', function (): void {
    config(['hadith.data_files' => []]);

    expect((new HadithDataFiles(alignFixtureDirectory()))->alignment('muslim'))->toBeNull();

    alignFixtureWrite(pin: false);

    expect((new HadithDataFiles(alignFixtureDirectory()))->alignment('muslim'))->toBeNull();
});

it('refuses an alignment whose bytes differ from the pin', function (): void {
    $dataFiles = alignFixtureWrite();
    config(['hadith.data_files' => ['chapters/alignment/muslim.json' => str_repeat('0', 64)]]);

    expect(fn () => $dataFiles->alignment('muslim'))->toThrow(HadithDataFileException::class, 'sha_mismatch');
});

it('refuses an alignment whose header names another collection', function (): void {
    $dataFiles = alignFixtureWrite(['collection' => 'malik']);

    expect(fn () => $dataFiles->alignment('muslim'))->toThrow(HadithDataFileException::class, 'collection_mismatch');
});

it('refuses an alignment whose openiti_sha256 is not the configured primary', function (): void {
    $dataFiles = alignFixtureWrite(['openiti_sha256' => str_repeat('1', 64)]);

    expect(fn () => $dataFiles->alignment('muslim'))->toThrow(HadithDataFileException::class, 'openiti_sha_mismatch');
});

it('refuses an alignment pinned to another fawazahmed0 commit', function (): void {
    $dataFiles = alignFixtureWrite(['fawazahmed0_commit' => str_repeat('a', 40)]);

    expect(fn () => $dataFiles->alignment('muslim'))->toThrow(HadithDataFileException::class, 'commit_mismatch');
});

it('refuses an alignment with a unit out of range or repeated', function (): void {
    $outOfRange = alignFixtureWrite(['units' => [['unit' => 10, 'hadith' => '1', 'score' => 0.9]]]);
    $repeated = alignFixtureWrite(['units' => [['unit' => 2, 'hadith' => '1', 'score' => 0.9], ['unit' => 2, 'hadith' => '2', 'score' => 0.9]]]);

    expect(fn () => $outOfRange->alignment('muslim'))->toThrow(HadithDataFileException::class, 'alignment_invalid')
        ->and(fn () => $repeated->alignment('muslim'))->toThrow(HadithDataFileException::class, 'alignment_invalid');
});

it('strips the numbering prefix of a Tirmidhi style title and keeps the rest as printed', function (): void {
    $bytes = implode("\n", [
        '#META#Header#End#',
        '### || (1) FIXTURE chapter title 1',
        '### ||| 1 - FIXTURE text 1 — not a hadith',
        "### || (\u{0662}) FIXTURE chapter 2 title",
        '### ||| 2 - FIXTURE text 2 — not a hadith',
        '### || FIXTURE chapter title 3 (4)',
        '### ||| 3 - FIXTURE text 3 — not a hadith',
    ]);

    $scan = alignFixtureScan($bytes, '/^### \|\|\| ?([0-9]+)/u', '/^###/u', '/^### \|\| (.+)$/u');

    expect(array_map(fn (OpenItiChapter $chapter): string => $chapter->title, $scan->chapters))->toBe([
        'FIXTURE chapter title 1',
        'FIXTURE chapter 2 title',
        'FIXTURE chapter title 3 (4)',
    ])
        ->and(array_map(fn (OpenItiChapter $chapter): bool => $chapter->numberingStripped, $scan->chapters))->toBe([true, true, false]);
});

it('strips the numbering prefix of a Muslim style title in both forms', function (): void {
    $bytes = implode("\n", [
        '#META#Header#End#',
        '# | 1 ( 1 ) FIXTURE chapter title 1',
        '# 1 FIXTURE text 1 — not a hadith',
        '# | '."\u{0662}".' ( '."\u{0662}".' ) FIXTURE chapter title 2',
        '# 2 FIXTURE text 2 — not a hadith',
        '# | 3 ( FIXTURE chapter title 3',
        '# 3 FIXTURE text 3 — not a hadith',
        '# | 4 ( 4 FIXTURE chapter title 4',
        '# 4 FIXTURE text 4 — not a hadith',
    ]);

    $scan = alignFixtureScan($bytes, '/^# ([0-9]+) /u', '/^(###|# \|)/u', '/^# \| (.+)$/u');

    expect(array_map(fn (OpenItiChapter $chapter): string => $chapter->title, $scan->chapters))->toBe([
        'FIXTURE chapter title 1',
        'FIXTURE chapter title 2',
        'FIXTURE chapter title 3',
        'FIXTURE chapter title 4',
    ])
        ->and(array_map(fn (OpenItiChapter $chapter): bool => $chapter->numberingStripped, $scan->chapters))->toBe([true, true, true, true]);
});

it('drops the closing bracket the numbering opened, and the Quran-quote tags, and keeps balanced brackets', function (): void {
    $bytes = implode("\n", [
        '#META#Header#End#',
        '# | 1 ( 1 FIXTURE chapter title 1 )',
        '# 1 FIXTURE text 1 — not a hadith',
        '# | 2 ( 2 FIXTURE chapter @QB@ quoted @QE@ title 2 )',
        '# 2 FIXTURE text 2 — not a hadith',
        '# | 4 FIXTURE chapter title 3 )',
        '# 3 FIXTURE text 3 — not a hadith',
        '# | FIXTURE chapter title 4 (4)',
        '# 4 FIXTURE text 4 — not a hadith',
    ]);

    $scan = alignFixtureScan($bytes, '/^# ([0-9]+) /u', '/^(###|# \|)/u', '/^# \| (.+)$/u');

    expect(array_map(fn (OpenItiChapter $chapter): string => $chapter->title, $scan->chapters))->toBe([
        'FIXTURE chapter title 1',
        'FIXTURE chapter quoted title 2',
        'FIXTURE chapter title 3',
        'FIXTURE chapter title 4 (4)',
    ])
        ->and(array_map(fn (OpenItiChapter $chapter): bool => $chapter->numberingStripped, $scan->chapters))->toBe([true, true, true, false]);
});

it('counts stripped titles in the report and gives each unit its file-order index', function (): void {
    $bytes = implode("\n", [
        '#META#Header#End#',
        '# | 1 ( 1 ) FIXTURE chapter title 1',
        '# 1 FIXTURE text 1 — not a hadith',
        '# | FIXTURE chapter title 2',
        '# 2 FIXTURE text 2 — not a hadith',
    ]);

    $scan = alignFixtureScan($bytes, '/^# ([0-9]+) /u', '/^(###|# \|)/u', '/^# \| (.+)$/u');
    $indexes = array_map(fn (OpenItiUnit $unit): int => $unit->index, [...$scan->chapters[0]->units, ...$scan->chapters[1]->units]);
    $run = alignFixtureRun(alignFixtureMapping(2), [$scan->chapters[0], $scan->chapters[1]], null);

    expect($indexes)->toBe([0, 1])
        ->and($run['report']['titles_numbering_stripped'])->toBe(1);
});
