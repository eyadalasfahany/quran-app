<?php

declare(strict_types=1);

use App\Domains\Hadith\Exceptions\HadithDataFileException;
use App\Domains\Hadith\Overlay\OpenItiUnitReader;
use Illuminate\Support\Facades\File;

/*
| The OpenITI unit reader (ADR 0076 §8.3, step 6b.6). Placeholder lines only; files live in a per-process temporary folder.
*/

const UNIT_START = '/^### \| ?([0-9]+) ?- /u';

const UNIT_STOP = '/^###/u';

function unitFile(string $content): string
{
    $directory = storage_path('framework/testing/hadith-units-'.getmypid());
    File::ensureDirectoryExists($directory);
    $path = $directory.'/unit-'.bin2hex(random_bytes(3)).'.txt';
    File::put($path, $content);

    return $path;
}

afterEach(function (): void {
    File::deleteDirectory(storage_path('framework/testing/hadith-units-'.getmypid()));
});

it('starts a unit at the marker and closes it at a stop line', function (): void {
    $path = unitFile("#META#Header#End#\n### | 1 - FIXTURE line a\nFIXTURE line b\n### | FIXTURE heading\nFIXTURE after stop\n");

    $units = (new OpenItiUnitReader)->units($path, UNIT_START, UNIT_STOP);

    expect($units)->toHaveCount(1)
        ->and($units[0]->lines)->toBe(['### | 1 - FIXTURE line a', 'FIXTURE line b'])
        ->and($units[0]->number)->toBe(1)
        ->and($units[0]->markerEnd)->toBe(strlen('### | 1 - '));
});

it('does not open a unit before the first marker', function (): void {
    $path = unitFile("#META#Header#End#\nFIXTURE before the first marker\n### | 1 - FIXTURE a\n");

    $units = (new OpenItiUnitReader)->units($path, UNIT_START, UNIT_STOP);

    expect($units)->toHaveCount(1)
        ->and($units[0]->lineIndex)->toBe(2);
});

it('keeps the unit index stable: the list is in file order', function (): void {
    $path = unitFile("#META#Header#End#\n### | 3 - FIXTURE c\n### | 1 - FIXTURE a\n### | 2 - FIXTURE b\n");

    $numbers = array_map(static fn ($unit): ?int => $unit->number, (new OpenItiUnitReader)->units($path, UNIT_START, UNIT_STOP));

    expect($numbers)->toBe([3, 1, 2]);
});

it('reads group 1 as the number and null when the pattern has no group', function (): void {
    $path = unitFile("#META#Header#End#\n### | 7 - FIXTURE a\n");

    $withGroup = (new OpenItiUnitReader)->units($path, UNIT_START, UNIT_STOP);
    $withoutGroup = (new OpenItiUnitReader)->units($path, '/^### \| ?[0-9]+ ?- /u', UNIT_STOP);

    expect($withGroup[0]->number)->toBe(7)
        ->and($withoutGroup[0]->number)->toBeNull();
});

it('handles a file without the header end marker', function (): void {
    $path = unitFile("### | 1 - FIXTURE a\n");

    expect((new OpenItiUnitReader)->units($path, UNIT_START, UNIT_STOP))->toHaveCount(1);
});

it('refuses a missing file without its path', function (): void {
    expect(fn () => (new OpenItiUnitReader)->units('/nonexistent/fixture-file', UNIT_START, UNIT_STOP))
        ->toThrow(HadithDataFileException::class, 'openiti_file_missing');
});
