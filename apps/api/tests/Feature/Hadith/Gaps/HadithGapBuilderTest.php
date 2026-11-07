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
| hadith:build-gaps (ADR 0076, step 6b.6). Placeholder Arabic texts only («نص تجريبي» and invented placeholder words), built in
| a temporary folder. The fawazahmed0 fixture is the default collection of the import tests. hadithapi.com is always faked.
*/

beforeEach(function (): void {
    Http::preventStrayRequests();
    Storage::fake('local');
    config(['hadith.title_match.request_gap_ms' => 0, 'hadith.extra_books' => []]);
    hadithImportUse(gapsFawazahmedFixture());
    hadithImportWarm();
});

afterEach(function (): void {
    File::deleteDirectory(gapsDataDirectory());
    File::deleteDirectory(gapsOpenItiDirectory());
    File::deleteDirectory((string) config('content_sources.cache_root'));
});

it('writes an openiti fill from the unit at openiti_unit', function (): void {
    gapsOpenItiFile(gapsStandardUnits());
    gapsDecisionsFile([gapsEntry('3', 'fill-safe', 'openiti', '2', '4', 2, '3')]);

    $proposal = gapsProposal(gapsBuild());

    expect($proposal['fills'])->toHaveCount(1)
        ->and($proposal['fills'][0]['number'])->toBe('3')
        ->and($proposal['fills'][0]['origin'])->toBe('openiti')
        ->and($proposal['fills'][0]['source_key'])->toBe('openiti:bukhari:3')
        ->and($proposal['fills'][0]['unit'])->toBe(2)
        ->and($proposal['fills'][0]['text_ar'])->toBe(GAP_TEXT_GAP)
        ->and($proposal['fills'][0]['source_text_sha256'])->toBe(hash('sha256', GAP_TEXT_GAP))
        ->and($proposal['unresolved'])->toBe([]);
});

it('refuses when the unit number does not match', function (): void {
    gapsOpenItiFile(gapsStandardUnits());
    gapsDecisionsFile([gapsEntry('3', 'fill-safe', 'openiti', '2', '4', 2, '9')]);

    $proposal = gapsProposal(gapsBuild());

    expect($proposal['fills'])->toBe([])
        ->and($proposal['unresolved'])->toBe([['number' => '3', 'reason' => 'unit_number_mismatch']]);
});

it('turns a failed neighbour re-check into unresolved, not a fill', function (): void {
    gapsOpenItiFile(gapsStandardUnits(unitBeforeText: 'كلمات اخرى مختلفة تماما'));
    gapsDecisionsFile([gapsEntry('3', 'fill-safe', 'openiti', '2', '4', 2, '3')]);

    $proposal = gapsProposal(gapsBuild());

    expect($proposal['fills'])->toBe([])
        ->and($proposal['unresolved'])->toBe([['number' => '3', 'reason' => 'recheck_neighbour_failed']]);
});

it('turns a duplicated fill into unresolved', function (): void {
    gapsOpenItiFile(gapsStandardUnits(gapText: GAP_TEXT_4));
    gapsDecisionsFile([gapsEntry('3', 'fill-safe', 'openiti', '2', '4', 2, '3')]);

    $proposal = gapsProposal(gapsBuild());

    expect($proposal['fills'])->toBe([])
        ->and($proposal['unresolved'])->toBe([['number' => '3', 'reason' => 'recheck_duplicate']]);
});

it('writes merge-prev and merge-next with the entry prev and next', function (): void {
    gapsOpenItiFile(gapsStandardUnits());
    gapsDecisionsFile([gapsEntry('3', 'merge-prev', 'openiti', '2', '4', 2, '3')]);
    expect(gapsProposal(gapsBuild())['merges'])->toBe([['number' => '3', 'into' => '2', 'origin' => 'openiti']]);

    gapsDecisionsFile([gapsEntry('3', 'merge-next', 'openiti', '2', '4', 2, '3')]);
    expect(gapsProposal(gapsBuild())['merges'])->toBe([['number' => '3', 'into' => '4', 'origin' => 'openiti']]);
});

it('lists unknown entries as unresolved', function (): void {
    gapsOpenItiFile(gapsStandardUnits());
    gapsDecisionsFile([gapsEntry('3', 'unknown', 'none', '2', '4', null, null, 'neighbour_not_confirmed')]);

    expect(gapsProposal(gapsBuild())['unresolved'])->toBe([['number' => '3', 'reason' => 'neighbour_not_confirmed']]);
});

it('refuses an OpenITI file whose SHA-256 differs from the pin', function (): void {
    gapsOpenItiFile(gapsStandardUnits());
    gapsDecisionsFile([gapsEntry('3', 'fill-safe', 'openiti', '2', '4', 2, '3')]);
    config(['hadith.openiti.files.bukhari.sha256' => str_repeat('0', 64)]);

    expect(fn () => gapsBuild())->toThrow(HadithGapBuildException::class, 'openiti_sha_mismatch');
});

it('refuses decisions whose SHA-256 differs from the pin', function (): void {
    gapsOpenItiFile(gapsStandardUnits());
    gapsDecisionsFile([gapsEntry('3', 'fill-safe', 'openiti', '2', '4', 2, '3')]);
    config(['hadith.data_files' => ['gaps/decisions/bukhari.json' => str_repeat('0', 64)]]);

    expect(fn () => gapsBuild())->toThrow(HadithDataFileException::class, 'sha_mismatch');
});

it('refuses a unit count that differs from the golden count', function (): void {
    gapsOpenItiFile(gapsStandardUnits());
    gapsDecisionsFile([gapsEntry('3', 'fill-safe', 'openiti', '2', '4', 2, '3')]);
    config(['hadith.openiti.files.bukhari.unit_count' => 99]);

    expect(fn () => gapsBuild())->toThrow(HadithGapBuildException::class, 'unit_count_mismatch');
});

it('writes a hadithapicom fill exactly as received, with no trim', function (): void {
    gapsOpenItiFile(gapsStandardUnits());
    gapsDecisionsFile([gapsEntry('3', 'fill-safe', 'hadithapi.com', '2', '4')]);
    config(['hadith.api_key' => 'FIXTURE-KEY-0001']);
    $received = '  '.GAP_TEXT_GAP.'  ';
    gapsFakeHapi([
        '2' => ['hadithNumber' => '2', 'hadithArabic' => GAP_TEXT_2],
        '3' => ['hadithNumber' => '3', 'hadithArabic' => $received],
        '4' => ['hadithNumber' => '4', 'hadithArabic' => GAP_TEXT_4],
    ]);

    $proposal = gapsProposal(gapsBuild('2026-11-07'));

    expect($proposal['fills'])->toHaveCount(1)
        ->and($proposal['fills'][0]['origin'])->toBe('hadithapicom')
        ->and($proposal['fills'][0]['text_ar'])->toBe($received)
        ->and($proposal['fills'][0])->not->toHaveKey('unit')
        ->and($proposal['origins']['hadithapicom']['source_version'])->toBe('retrieved-2026-11-07');
});

it('lists hadithapicom numbers as unresolved when the key is missing', function (): void {
    gapsOpenItiFile(gapsStandardUnits());
    gapsDecisionsFile([gapsEntry('3', 'fill-safe', 'hadithapi.com', '2', '4')]);
    config(['hadith.api_key' => null]);

    $proposal = gapsProposal(gapsBuild('2026-11-07'));

    expect($proposal['fills'])->toBe([])
        ->and($proposal['unresolved'])->toBe([['number' => '3', 'reason' => 'hadithapi_key_missing']]);
});

it('requires --retrieved-on when a hadithapi.com row is written', function (): void {
    gapsOpenItiFile(gapsStandardUnits());
    gapsDecisionsFile([gapsEntry('3', 'merge-prev', 'hadithapi.com', '2', '4')]);
    config(['hadith.api_key' => 'FIXTURE-KEY-0001']);
    gapsFakeHapi(['3' => ['hadithNumber' => '2,3', 'hadithArabic' => GAP_TEXT_GAP]]);

    expect(fn () => gapsBuild(null))->toThrow(HadithGapBuildException::class, 'retrieved_on_required');
});

it('is deterministic: two runs give identical bytes', function (): void {
    gapsOpenItiFile(gapsStandardUnits());
    gapsDecisionsFile([gapsEntry('3', 'fill-safe', 'openiti', '2', '4', 2, '3')]);

    expect(gapsBuild()->proposalJson)->toBe(gapsBuild()->proposalJson);
});

it('the proposal passes the same validation as the importer', function (): void {
    gapsOpenItiFile(gapsStandardUnits());
    gapsDecisionsFile([gapsEntry('3', 'fill-safe', 'openiti', '2', '4', 2, '3')]);
    $result = gapsBuild();
    File::ensureDirectoryExists(gapsDataDirectory().'/gaps');
    File::put(gapsDataDirectory().'/gaps/bukhari.json', $result->proposalJson);
    config(['hadith.data_files' => array_merge((array) config('hadith.data_files'), ['gaps/bukhari.json' => hash('sha256', $result->proposalJson)])]);

    $file = (new HadithDataFiles(gapsDataDirectory()))->gaps('bukhari');

    expect($file?->fills)->toHaveCount(1)
        ->and($file?->fills[0]->text)->toBe(GAP_TEXT_GAP);
});

it('never prints text or titles in the report', function (): void {
    gapsOpenItiFile(gapsStandardUnits());
    gapsDecisionsFile([gapsEntry('3', 'fill-safe', 'openiti', '2', '4', 2, '3')]);

    $report = json_encode(gapsBuild()->report, JSON_THROW_ON_ERROR);

    expect($report)->not->toContain(GAP_TEXT_GAP)
        ->and($report)->not->toContain(GAP_TEXT_2);
});

it('finds the n-th book heading at either heading level and writes null book_number when undecided', function (): void {
    $units = [['1', GAP_TEXT_1], ['2', GAP_TEXT_2]];
    $lines = "#META#Header#End#\n### | كتاب تجريبي\n### | 1 - ".GAP_TEXT_1."\n### | 2 - ".GAP_TEXT_2."\n";
    File::ensureDirectoryExists(gapsOpenItiDirectory());
    File::put(gapsOpenItiDirectory().'/FIXTURE.Sunan.Shamela0000001-ara1', $lines);
    config(['hadith.openiti.files' => ['bukhari' => [
        'path' => 'FIXTURE/FIXTURE.Sunan.Shamela0000001-ara1',
        'sha256' => hash('sha256', $lines),
        'unit_start' => '/^### \\| ?([0-9]+) ?- /u',
        'unit_stop' => '/^###/u',
        'unit_count' => count($units),
    ]]]);
    config(['hadith.extra_books' => ['bukhari' => [['book_number' => null, 'after_book' => '1', 'first' => '1', 'last' => '2', 'openiti_heading_ordinal' => 1]]]]);
    gapsDecisionsFile([gapsEntry('3', 'unknown', 'none', '2', '4', null, null)], hash('sha256', $lines));

    $result = gapsBuild();
    $proposal = gapsProposal($result);

    expect($proposal['books'])->toHaveCount(1)
        ->and($proposal['books'][0]['book_number'])->toBeNull()
        ->and($proposal['books'][0]['source_key'])->toBe('openiti:bukhari:book:1')
        ->and($proposal['books'][0]['title_ar'])->toBe('كتاب تجريبي')
        ->and($result->report['extra_books'][0]['book_number_undecided'])->toBeTrue();
});

it('applies the 95% two-way rule with integer math', function (int $present, bool $passes): void {
    $units = [];

    for ($number = 1; $number <= 20; $number++) {
        if ($number <= $present) {
            $units[] = [(string) $number, 'نص تجريبي '.$number.' ليس حديثا'];
        }
    }

    $lines = "#META#Header#End#\n### | كتاب تجريبي\n";

    foreach ($units as [$number, $text]) {
        $lines .= '### | '.$number.' - '.$text."\n";
    }

    File::ensureDirectoryExists(gapsOpenItiDirectory());
    File::put(gapsOpenItiDirectory().'/FIXTURE.Sunan.Shamela0000001-ara1', $lines);
    config(['hadith.openiti.files' => ['bukhari' => [
        'path' => 'FIXTURE/FIXTURE.Sunan.Shamela0000001-ara1',
        'sha256' => hash('sha256', $lines),
        'unit_start' => '/^### \\| ?([0-9]+) ?- /u',
        'unit_stop' => '/^###/u',
        'unit_count' => count($units),
    ]]]);
    config(['hadith.extra_books' => ['bukhari' => [['book_number' => '1.1', 'after_book' => '1', 'first' => '1', 'last' => '20', 'openiti_heading_ordinal' => 1]]]]);
    gapsDecisionsFile([gapsEntry('3', 'unknown', 'none', '2', '4', null, null)], hash('sha256', $lines));

    if ($passes) {
        expect(gapsProposal(gapsBuild())['books'])->toHaveCount(1);
    } else {
        expect(fn () => gapsBuild())->toThrow(HadithGapBuildException::class, 'book_two_way_failed');
    }
})->with([
    '19 of 20 is 95% and passes' => [19, true],
    '18 of 20 is 90% and fails' => [18, false],
]);

it('refuses to run in production before any key or file is read', function (): void {
    app()['env'] = 'production';

    $this->artisan('hadith:build-gaps', ['--openiti-dir' => gapsOpenItiDirectory()])
        ->expectsOutputToContain('disabled in production')
        ->assertExitCode(1);
});
