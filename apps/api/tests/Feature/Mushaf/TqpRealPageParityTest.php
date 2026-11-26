<?php

declare(strict_types=1);

use App\Domains\Mushaf\Packs\Tqp\TqpEncoder;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;

/*
| Parity with the reference codec on real pages (ADR 0090 amendment of 26 Nov 2026). The pages come from the local source cache,
| which is never checked in: the test is skipped when the cache or python3 is missing. Nothing from the cache is written anywhere
| but a temporary file that is deleted at the end.
*/

/**
 * The developer's real source cache. The test cache root is redirected to a temporary folder, so this path is built from storage_path().
 */
function tqpParityPage(int $page): string
{
    return storage_path('app/private/sources/svg-mushaf/'.config('mushaf.commit').'/mushafs/hafs/kfqc/svg/'.sprintf('%03d', $page).'.svg');
}

function tqpParityCacheReady(): bool
{
    return is_file(tqpParityPage(1)) && is_file(tqpParityPage(604));
}

function tqpParityPythonReady(): bool
{
    return Process::run(['python3', '--version'])->successful();
}

it('encodes a real Hafs page to the container tqp.py writes, byte for byte', function (int $page): void {
    $directory = storage_path('app/tmp/tqp-parity');
    File::ensureDirectoryExists($directory);
    $output = $directory.'/'.bin2hex(random_bytes(8)).'.bin';

    try {
        $script = realpath(base_path('../../docs/plans/madinah-svg-mushaf/spike/tqp.py'));
        $result = Process::run(['python3', '-I', (string) $script, 'body', '32', tqpParityPage($page), $output]);

        expect($result->successful())->toBeTrue($result->errorOutput())
            ->and((new TqpEncoder)->container((string) file_get_contents(tqpParityPage($page))))
            ->toBe((string) file_get_contents($output));
    } finally {
        File::delete($output);
    }
})->with([1, 2, 3, 50, 300, 604])->skip(
    fn (): bool => ! tqpParityCacheReady() || ! tqpParityPythonReady(),
    'The Hafs SVG cache or python3 is missing.',
);
