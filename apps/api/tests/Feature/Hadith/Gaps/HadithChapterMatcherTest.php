<?php

declare(strict_types=1);

use App\Domains\Hadith\Import\Records\MappingResult;
use App\Domains\Hadith\Overlay\GapFill;
use App\Domains\Hadith\Overlay\HadithDataFiles;
use App\Domains\Hadith\Overlay\HadithOverlay;
use App\Domains\Hadith\Overlay\OpenItiChapter;
use App\Domains\Hadith\Overlay\OpenItiUnit;
use App\Domains\Hadith\Services\HadithChapterMatcher;
use App\Domains\Hadith\Sources\Records\SourceSection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;

require_once __DIR__.'/../Support/HadithFixtureFiles.php';
require_once __DIR__.'/../Support/HadithImportFixtures.php';

uses(RefreshDatabase::class);

/*
| The chapter matcher (ADR 0076 §5, brief 9.3, step 6b.7). Built in memory: placeholder words per number, one word per text, so
| the word-set check is exact. Placeholder only.
*/

afterEach(function (): void {
    File::deleteDirectory(storage_path('framework/testing/hadith-chapter-match-'.getmypid()));
});

/** A placeholder word per number: distinct, at least three letters, Arabic letters only. */
function matchWord(int $number): string
{
    return 'ب'.str_repeat('ا', $number).'ت';
}

function matchUnit(int $number, string $text): OpenItiUnit
{
    $marker = '### | '.$number.' - ';

    return new OpenItiUnit($number, [$marker.$text], strlen($marker), 0);
}

/**
 * @param  list<OpenItiUnit>  $units
 */
function matchChapter(int $index, array $units, string $title = 'FIXTURE chapter title'): OpenItiChapter
{
    return new OpenItiChapter($index, $title.' '.$index, false, $units);
}

/**
 * A mapping of rows numbered $from..$to in book $book (text is the number's own placeholder word, unless $skip lists numbers
 * with no text), with one section per book. Returns the mapping.
 *
 * @param  list<int>  $skip
 */
function matchMapping(string $book, int $from, int $to, array $skip = []): MappingResult
{
    $hadiths = [];

    for ($number = $from; $number <= $to; $number++) {
        $hadiths[] = hadithImportHadith((string) $number, in_array($number, $skip, true) ? null : matchWord($number), $book);
    }

    return hadithImportMap(hadithImportRecord($hadiths, [new SourceSection($book, null, (string) $from, (string) $to, null, null)]));
}

/**
 * @param  list<int>  $numbers
 * @param  list<int>  $wrong  numbers whose unit text is another word (fail the forward check)
 */
function matchUnits(array $numbers, array $wrong = []): array
{
    return array_map(static fn (int $number): OpenItiUnit => matchUnit($number, in_array($number, $wrong, true) ? matchWord($number + 1000) : matchWord($number)), $numbers);
}

function matchRun(MappingResult $mapping, array $chapters, string $partialBooks = 'drop'): array
{
    $result = app(HadithChapterMatcher::class)->match('bukhari', $mapping, $chapters, 0, ['unit_marker' => 0], $partialBooks, [
        'release' => '2023.1.8',
        'doi' => 'FIXTURE doi',
        'version_id' => 'FIXTURE version',
        'source_file_sha256' => str_repeat('2', 64),
        'licence' => 'FIXTURE licence',
    ]);

    return ['proposal' => json_decode($result->proposalJson, true, flags: JSON_THROW_ON_ERROR), 'report' => $result->report, 'json' => $result->proposalJson];
}

it('accepts a chapter whose numbers are all in one book and match', function (): void {
    $run = matchRun(matchMapping('1', 1, 3), [matchChapter(1, matchUnits([1, 2, 3]))]);

    expect($run['report']['decisions'][0]['result'])->toBe('accepted')
        ->and($run['proposal']['chapters'])->toHaveCount(1)
        ->and($run['proposal']['chapters'][0]['first'])->toBe('1')
        ->and($run['proposal']['chapters'][0]['last'])->toBe('3');
});

it('rejects a chapter with one number in another book even at a 100% text match', function (): void {
    $mapping = hadithImportMap(hadithImportRecord(
        [hadithImportHadith('1', matchWord(1), '1'), hadithImportHadith('21', matchWord(21), '2')],
        [new SourceSection('1', null, '1', '1', null, null), new SourceSection('2', null, '21', '21', null, null)],
    ));

    $run = matchRun($mapping, [matchChapter(1, matchUnits([1, 21]))]);

    expect($run['report']['decisions'][0]['result'])->toBe('crosses_books');
});

it('applies the ceiling rule: 19 of 20 passes forward, 18 of 20 fails, and 19 of 19 is required at 19', function (): void {
    $mapping = matchMapping('1', 1, 20);
    $nineteen = matchRun($mapping, [matchChapter(1, matchUnits(range(1, 20), [5]))]);
    $eighteen = matchRun($mapping, [matchChapter(1, matchUnits(range(1, 20), [5, 6]))]);
    $oneRow = matchRun(matchMapping('1', 1, 1), [matchChapter(1, matchUnits([1]))]);
    $nineteenRows = matchRun(matchMapping('1', 1, 19), [matchChapter(1, matchUnits(range(1, 19), [7]))]);

    expect($nineteen['report']['decisions'][0]['forward_required'])->toBe(19)
        ->and($nineteen['report']['decisions'][0]['result'])->toBe('accepted')
        ->and($eighteen['report']['decisions'][0]['result'])->toBe('forward_below_threshold')
        ->and($oneRow['report']['decisions'][0]['forward_required'])->toBe(1)
        ->and($nineteenRows['report']['decisions'][0]['forward_required'])->toBe(19)
        ->and($nineteenRows['report']['decisions'][0]['result'])->toBe('forward_below_threshold');
});

it('rejects a chapter whose forward check fails alone and one whose backward check fails alone', function (): void {
    $forward = matchRun(matchMapping('1', 1, 3), [matchChapter(1, matchUnits([1, 2, 3], [1, 2, 3]))]);
    $backward = matchRun(matchMapping('1', 1, 20), [matchChapter(1, matchUnits([1, 20]))]);

    expect($forward['report']['decisions'][0]['result'])->toBe('forward_below_threshold')
        ->and($backward['report']['decisions'][0]['result'])->toBe('backward_below_threshold')
        ->and($backward['report']['decisions'][0]['backward_m'])->toBe(20)
        ->and($backward['report']['decisions'][0]['backward_c'])->toBe(2);
});

it('aligns numbers by exact string: 2787 is not 2787.2', function (): void {
    $mapping = hadithImportMap(hadithImportRecord(
        [hadithImportHadith('2787', matchWord(7), '1'), hadithImportHadith('2787.2', matchWord(8), '1')],
        [new SourceSection('1', null, '2787', '2787.2', null, null)],
    ));

    $unit = new OpenItiUnit(2787, ['### | 2787 - '.matchWord(7)], strlen('### | 2787 - '), 0);
    $run = matchRun($mapping, [matchChapter(1, [$unit])], 'keep');

    expect($run['report']['decisions'][0]['n_listed'])->toBe(1)
        ->and($run['report']['decisions'][0]['result'])->toBe('accepted')
        ->and($run['proposal']['chapters'][0]['last'])->toBe('2787');
});

it('excludes numbers with no text from the forward check and counts them', function (): void {
    $mapping = matchMapping('1', 1, 3, [2]);

    $run = matchRun($mapping, [matchChapter(1, matchUnits([1, 2, 3]))]);

    expect($run['report']['decisions'][0]['n'])->toBe(3)
        ->and($run['report']['decisions'][0]['n_listed'])->toBe(2)
        ->and($run['report']['decisions'][0]['listed_without_text'])->toBe(1)
        ->and($run['report']['decisions'][0]['result'])->toBe('accepted');
});

it('treats a fill row inside a chapter like any other entry', function (): void {
    $hadiths = [hadithImportHadith('1', matchWord(1), '1'), hadithImportHadith('2', null, '1'), hadithImportHadith('3', matchWord(3), '1')];
    $overlay = new HadithOverlay(
        merges: [],
        originSourceIds: ['openiti' => 7],
        originVersions: ['openiti' => '2023.1.8'],
        fills: ['2' => new GapFill('2', 'openiti', 'openiti:bukhari:2', 2, matchWord(2), hash('sha256', matchWord(2)))],
    );
    $mapping = hadithImportMapWithOverlay(hadithImportRecord($hadiths, [new SourceSection('1', null, '1', '3', null, null)]), $overlay);

    $run = matchRun($mapping, [matchChapter(1, matchUnits([1, 2, 3]))]);

    expect($run['report']['decisions'][0]['n_listed'])->toBe(3)
        ->and($run['report']['decisions'][0]['result'])->toBe('accepted');
});

it('writes only accepted chapters of complete books under drop, and every accepted chapter under keep', function (): void {
    $hadiths = [];
    $hadiths[] = hadithImportHadith('1', matchWord(1), '1');
    $hadiths[] = hadithImportHadith('2', matchWord(2), '1');
    $hadiths[] = hadithImportHadith('3', matchWord(3), '1');
    $hadiths[] = hadithImportHadith('21', matchWord(21), '2');
    $hadiths[] = hadithImportHadith('22', matchWord(22), '2');
    $hadiths[] = hadithImportHadith('23', matchWord(23), '2');
    $mapping = hadithImportMap(hadithImportRecord($hadiths, [
        new SourceSection('1', null, '1', '3', null, null),
        new SourceSection('2', null, '21', '23', null, null),
    ]));
    $chapters = [matchChapter(1, matchUnits([1, 2, 3])), matchChapter(2, matchUnits([21]))];

    $drop = matchRun($mapping, $chapters, 'drop');
    $keep = matchRun($mapping, $chapters, 'keep');

    expect($drop['proposal']['chapters'])->toHaveCount(1)
        ->and($drop['proposal']['chapters'][0]['book_number'])->toBe('1')
        ->and($keep['proposal']['chapters'])->toHaveCount(2)
        ->and($drop['report']['coverage']['2'])->toMatchArray(['entries_total' => 3, 'entries_covered' => 1, 'complete' => false])
        ->and($drop['report']['coverage']['1']['complete'])->toBeTrue();
});

it('numbers ordinals per book and keeps a rejected chapter\'s slot', function (): void {
    $mapping = matchMapping('1', 1, 4);
    $run = matchRun($mapping, [
        matchChapter(1, matchUnits([1], [1])),
        matchChapter(2, matchUnits([2, 3])),
    ], 'keep');

    expect(array_column($run['report']['decisions'], 'ordinal'))->toBe([1, 2])
        ->and($run['proposal']['chapters'][0]['ordinal'])->toBe(2);
});

it('lists every decision with both counts and keeps only whitelisted keys in the proposal', function (): void {
    $run = matchRun(matchMapping('1', 1, 3), [matchChapter(1, matchUnits([1, 2, 3]))]);

    expect($run['report']['decisions'])->toHaveCount(1)
        ->and(array_keys($run['report']['decisions'][0]))->toContain('forward_passed', 'forward_required', 'backward_c', 'backward_m', 'backward_required', 'result')
        ->and(array_keys($run['proposal']))->toEqualCanonicalizing(['schema_version', 'collection', 'source', 'release', 'doi', 'version_id', 'source_file_sha256', 'matcher_version', 'partial_books', 'licence', 'chapters'])
        ->and(array_keys($run['proposal']['chapters'][0]))->toEqualCanonicalizing(['ordinal', 'book_number', 'first', 'last', 'title_ar']);
});

it('the proposal loads through HadithDataFiles::chapters() with a temporary pin', function (): void {
    $run = matchRun(matchMapping('1', 1, 3), [matchChapter(1, matchUnits([1, 2, 3]))], 'drop');
    $directory = storage_path('framework/testing/hadith-chapter-match-'.getmypid());
    File::ensureDirectoryExists($directory.'/chapters');
    File::put($directory.'/chapters/bukhari.json', $run['json']);
    config(['hadith.data_files' => ['chapters/bukhari.json' => hash('sha256', $run['json'])]]);

    $file = (new HadithDataFiles($directory))->chapters('bukhari');

    expect($file?->partialBooks)->toBe('drop')
        ->and($file?->chapters)->toHaveCount(1);
});

it('prints no title and no hadith text in the report', function (): void {
    $run = matchRun(matchMapping('1', 1, 3), [matchChapter(1, matchUnits([1, 2, 3]))]);

    expect($run['json'])->toContain('FIXTURE chapter title')
        ->and(json_encode($run['report'], JSON_THROW_ON_ERROR))->not->toContain('FIXTURE chapter title')
        ->and(json_encode($run['report'], JSON_THROW_ON_ERROR))->not->toContain(matchWord(1));
});
