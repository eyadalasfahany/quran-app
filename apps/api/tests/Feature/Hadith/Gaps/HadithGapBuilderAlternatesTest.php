<?php

declare(strict_types=1);

use App\Domains\Hadith\Exceptions\HadithGapBuildException;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

require_once __DIR__.'/../Support/HadithFixtureFiles.php';
require_once __DIR__.'/../Support/HadithImportFixtures.php';
require_once __DIR__.'/../Support/HadithGapFixtures.php';

/*
| hadith:build-gaps with alternate OpenITI files (step 6b.6): a decision names another file of the collection by openiti_path,
| and the builder reads its unit from alt_openiti_unit after the SHA-256 check against config. Placeholder text only.
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

/**
 * The fill-safe entry of number 3 that names the alternate file, with its unit in alt_openiti_unit (as the decisions file has it).
 *
 * @return array<string, mixed>
 */
function gapsAlternateEntry(string $file, string $hadith, string $class = 'fill-safe', int $unit = 1): array
{
    return [...gapsEntry($hadith, $class, 'openiti', '2', '4'), 'openiti_path' => '0000Fixture/0000Fixture.Sunan/'.$file, 'alt_openiti_unit' => $unit, 'alt_openiti_unit_number' => $hadith];
}

const GAP_ALTERNATE_FILE = 'FIXTURE.Alt.Shamela0000002-ara1';

it('fills from an alternate file at its own unit and records the file, its header and its pin', function (): void {
    gapsOpenItiFile(gapsStandardUnits());
    $path = gapsAlternateFile(GAP_ALTERNATE_FILE, [['2', GAP_TEXT_2], ['3', GAP_TEXT_GAP], ['4', GAP_TEXT_4]]);
    gapsDecisionsFile([gapsAlternateEntry(GAP_ALTERNATE_FILE, '3')]);

    $proposal = gapsProposal(gapsBuild());

    expect($proposal['fills'])->toHaveCount(1)
        ->and($proposal['fills'][0]['origin'])->toBe('openiti')
        ->and($proposal['fills'][0]['openiti_file'])->toBe(GAP_ALTERNATE_FILE)
        ->and($proposal['fills'][0]['unit'])->toBe(1)
        ->and($proposal['fills'][0]['text_ar'])->toBe(GAP_TEXT_GAP)
        ->and($proposal['unresolved'])->toBe([])
        ->and($proposal['origins']['openiti']['file'])->toBe('FIXTURE/FIXTURE.Sunan.Shamela0000001-ara1')
        ->and($proposal['origins']['openiti']['alternate_files'])->toBe([
            ['file' => 'FIXTURE/'.GAP_ALTERNATE_FILE, 'file_sha256' => hash_file('sha256', $path)],
        ]);
});

it('records the primary file name on a fill from the primary file', function (): void {
    gapsOpenItiFile(gapsStandardUnits());
    gapsDecisionsFile([gapsEntry('3', 'fill-safe', 'openiti', '2', '4', 2, '3')]);

    $proposal = gapsProposal(gapsBuild());

    expect($proposal['fills'][0]['openiti_file'])->toBe('FIXTURE.Sunan.Shamela0000001-ara1')
        ->and($proposal['origins']['openiti'])->not->toHaveKey('alternate_files');
});

it('refuses a fill from an alternate that has no SHA-256 pin', function (): void {
    gapsOpenItiFile(gapsStandardUnits());
    gapsAlternateFile(GAP_ALTERNATE_FILE, [['2', GAP_TEXT_2], ['3', GAP_TEXT_GAP], ['4', GAP_TEXT_4]], pinned: false);
    gapsDecisionsFile([gapsAlternateEntry(GAP_ALTERNATE_FILE, '3')]);

    expect(fn (): object => gapsBuild())->toThrow(HadithGapBuildException::class, 'openiti_alternate_unpinned');
});

it('refuses a fill from an alternate whose bytes differ from its pin', function (): void {
    gapsOpenItiFile(gapsStandardUnits());
    gapsAlternateFile(GAP_ALTERNATE_FILE, [['2', GAP_TEXT_2], ['3', GAP_TEXT_GAP], ['4', GAP_TEXT_4]], pin: str_repeat('a', 64));
    gapsDecisionsFile([gapsAlternateEntry(GAP_ALTERNATE_FILE, '3')]);

    expect(fn (): object => gapsBuild())->toThrow(HadithGapBuildException::class, 'openiti_alternate_sha_mismatch');
});

it('refuses a decision that names a file config does not list as an alternate', function (): void {
    gapsOpenItiFile(gapsStandardUnits());
    gapsDecisionsFile([gapsAlternateEntry('FIXTURE.Unlisted.Shamela0000003-ara1', '3')]);

    expect(fn (): object => gapsBuild())->toThrow(HadithGapBuildException::class, 'openiti_alternate_unknown');
});

it('does not force the pin of an alternate that only a merge names', function (): void {
    gapsOpenItiFile(gapsStandardUnits());
    gapsAlternateFile(GAP_ALTERNATE_FILE, [['2', GAP_TEXT_2], ['3', GAP_TEXT_GAP], ['4', GAP_TEXT_4]], pinned: false);
    gapsDecisionsFile([gapsAlternateEntry(GAP_ALTERNATE_FILE, '3', 'merge-next')]);

    $proposal = gapsProposal(gapsBuild());

    expect($proposal['merges'])->toBe([['number' => '3', 'into' => '4', 'origin' => 'openiti']])
        ->and($proposal['fills'])->toBe([]);
});
