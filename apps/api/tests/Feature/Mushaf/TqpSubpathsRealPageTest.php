<?php

declare(strict_types=1);

use App\Domains\Mushaf\Packs\Tqp\TqpSubpaths;
use App\Domains\Mushaf\WordBoxes\PageContours;

/*
| The subpath map on real artwork (ADR 0090 step 13 A2). The pages come from the local source cache, which is never checked in:
| the test is skipped when the cache is missing. Nothing from the cache is written or copied; only counts are asserted.
*/

function subpathsRealPage(string $folder, int $page): string
{
    return storage_path('app/private/sources/svg-mushaf/'.config('mushaf.commit').'/mushafs/'.$folder.'/kfqc/svg/'.sprintf('%03d', $page).'.svg');
}

function subpathsCacheReady(): bool
{
    return is_file(subpathsRealPage('hafs', 1)) && is_file(subpathsRealPage('hafs', 604));
}

it('maps every content contour of a real Hafs page to a TQP subpath, in order', function (int $page): void {
    $svg = (string) file_get_contents(subpathsRealPage('hafs', $page));
    $map = (new TqpSubpaths)->map($svg, $page);
    $contours = PageContours::fromSvg($svg);

    expect(count($map['content']))->toBe(count($contours))
        ->and($map['content'])->toBe(array_values(array_unique($map['content'])))
        ->and(max($map['content'] ?: [-1]))->toBeLessThan($map['subpaths']);

    foreach ($map['content'] as $index => $subpath) {
        if ($index > 0) {
            expect($subpath)->toBeGreaterThan($map['content'][$index - 1]);
        }
    }
})->with([1, 2, 3, 50, 300, 604])->skip(fn () => ! subpathsCacheReady(), 'The Hafs source cache is not on this machine.');
