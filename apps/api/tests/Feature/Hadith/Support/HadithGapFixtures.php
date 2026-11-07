<?php

declare(strict_types=1);

/*
| Shared fixtures of the gap builder tests (ADR 0076, step 6b.6): placeholder OpenITI files, decisions files and hadithapi.com
| fakes. Not a test file; test files load it with require_once. Placeholder text only.
*/

use App\Domains\Hadith\Overlay\HadithDataFiles;
use App\Domains\Hadith\Services\HadithGapBuilder;
use Illuminate\Http\Client\Factory;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;

const GAP_TEXT_1 = 'نص تجريبي واحد ليس حديثا';

const GAP_TEXT_2 = 'تجريبي اثنان ليس حديثا';

const GAP_TEXT_4 = 'رابع مختلف كليا عن الاول';

const GAP_TEXT_GAP = 'كلام ثالث مميز جدا';

function gapsDataDirectory(): string
{
    return storage_path('framework/testing/hadith-gaps-'.getmypid());
}

function gapsOpenItiDirectory(): string
{
    return storage_path('framework/testing/hadith-openiti-'.getmypid());
}

/**
 * Writes the placeholder OpenITI file (one line per unit) and pins it in config. Returns the file path.
 *
 * @param  list<array{0: string, 1: string}>  $units  number => text, in file order
 */
function gapsOpenItiFile(array $units): string
{
    File::ensureDirectoryExists(gapsOpenItiDirectory());
    $path = gapsOpenItiDirectory().'/FIXTURE.Sunan.Shamela0000001-ara1';
    $lines = ['#META#Header#End#'];

    foreach ($units as [$number, $text]) {
        $lines[] = '### | '.$number.' - '.$text;
    }

    $bytes = implode("\n", $lines)."\n";
    File::put($path, $bytes);
    config(['hadith.openiti.files' => ['bukhari' => [
        'path' => 'FIXTURE/FIXTURE.Sunan.Shamela0000001-ara1',
        'sha256' => hash('sha256', $bytes),
        'unit_start' => '/^### \\| ?([0-9]+) ?- /u',
        'unit_stop' => '/^###/u',
        'unit_count' => count($units),
    ]]]);

    return $path;
}

/**
 * Writes and pins the decisions file of bukhari, pointing at the OpenITI file. Returns the decisions bytes' SHA-256.
 *
 * @param  list<array<string, mixed>>  $entries
 */
function gapsDecisionsFile(array $entries, ?string $openitiSha = null): void
{
    $document = [
        'collection' => 'bukhari',
        'openiti' => ['source' => 'openiti', 'path' => 'FIXTURE/FIXTURE.Sunan.Shamela0000001-ara1', 'sha256' => $openitiSha ?? (string) config('hadith.openiti.files.bukhari.sha256')],
        'fawazahmed0_commit' => (string) config('hadith.commit'),
        'containment_threshold' => 0.8,
        'entries' => $entries,
    ];
    $bytes = json_encode($document, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)."\n";
    File::ensureDirectoryExists(gapsDataDirectory().'/gaps/decisions');
    File::put(gapsDataDirectory().'/gaps/decisions/bukhari.json', $bytes);
    config(['hadith.data_files' => ['gaps/decisions/bukhari.json' => hash('sha256', $bytes)]]);
    app()->instance(HadithDataFiles::class, new HadithDataFiles(gapsDataDirectory()));
}

/**
 * @return array<string, mixed>
 */
function gapsEntry(string $hadith, string $class, string $source, string $prev, string $next, ?int $unit = null, ?string $unitNumber = null, ?string $reason = null): array
{
    return [
        'hadith' => $hadith,
        'run_first' => $hadith,
        'run_last' => $hadith,
        'reason' => $reason,
        'class' => $class,
        'source' => $source,
        'prev' => $prev,
        'next' => $next,
        'openiti_unit' => $unit,
        'openiti_unit_number' => $unitNumber ?? ($unit === null ? null : (string) $unit),
        'hapi_numbers_in_record' => $source === 'hadithapi.com' ? 1 : null,
        'hapi_declared_merge' => null,
    ];
}

/**
 * The standard placeholder units: 1, 2, the gap 3, 4 and 2787; neighbours 2 and 4 match the fawazahmed0 fixture.
 *
 * @return list<array{0: string, 1: string}>
 */
function gapsStandardUnits(?string $gapText = null, ?string $unitBeforeText = null): array
{
    return [
        ['1', GAP_TEXT_1],
        ['2', $unitBeforeText ?? GAP_TEXT_2],
        ['3', $gapText ?? GAP_TEXT_GAP],
        ['4', GAP_TEXT_4],
        ['2787', 'نص تجريبي خامس ليس حديثا'],
    ];
}

function gapsBuild(?string $retrievedOn = null): object
{
    return app(HadithGapBuilder::class)->build('bukhari', gapsOpenItiDirectory(), $retrievedOn);
}

/**
 * @return array<string, mixed>
 */
function gapsProposal(object $result): array
{
    return json_decode($result->proposalJson, true, flags: JSON_THROW_ON_ERROR);
}

/**
 * The fawazahmed0 fixture with Arabic placeholder texts for hadith 1, 2 and 4 (the word set keeps only Arabic letters).
 */
function gapsFawazahmedFixture(): array
{
    return hadithImportFiles(function (string $path, array $data): array {
        if ($path !== 'editions/ara-bukhari.json') {
            return $data;
        }

        $texts = ['1' => GAP_TEXT_1, '2' => GAP_TEXT_2, '4' => GAP_TEXT_4];

        foreach ($data['hadiths'] as $index => $hadith) {
            $key = (string) $hadith['hadithnumber'];

            if (isset($texts[$key])) {
                $data['hadiths'][$index]['text'] = $texts[$key];
            }
        }

        return $data;
    });
}

/**
 * Fakes hadithapi.com: the record for each number, as the paced client asks for it. A number with no entry gives no record.
 *
 * @param  array<string, array{hadithNumber: string, hadithArabic: string}>  $records
 */
function gapsFakeHapi(array $records): void
{
    Http::swap(new Factory);
    Http::fake(function (Request $request) use ($records): array {
        parse_str((string) parse_url($request->url(), PHP_URL_QUERY), $query);
        $record = $records[$query['hadithNumber'] ?? ''] ?? null;

        return ['hadiths' => ['data' => $record === null ? [] : [['id' => 'FIXTURE-'.$query['hadithNumber'], ...$record]]]];
    });
}
