<?php

declare(strict_types=1);

use App\Domains\Mushaf\Exceptions\SvgMushafSourceException;
use App\Domains\Mushaf\Packs\Tqp\TqpSubpaths;

// Synthetic paths only («FIXTURE — not artwork»): no Quran artwork, no Quran text (ADR 0090 step 13 A2).

/**
 * @param  string  $markers  the inside of #ayah_markers
 * @param  string  $content  the inside of #content
 */
function tqpFixtureSvg(string $markers, string $content): string
{
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 345 550"><g transform="matrix(1 0 0 -1 0 550)">'
        .'<g id="ayah_markers">'.$markers.'</g><g id="content">'.$content.'</g></g></svg>';
}

it('numbers the ayah-mark subpaths before the content, and reports the mark group', function (): void {
    $map = (new TqpSubpaths)->map(tqpFixtureSvg('<g class="ayah-mark"><path d="M0 0 L1 1"/></g>', '<path d="M5 5 L6 6"/>'), 1);

    expect($map['content'])->toBe([1])
        ->and($map['subpaths'])->toBe(2)
        ->and($map['marks'])->toHaveCount(1)
        ->and($map['marks'][0]['first'])->toBe(0)
        ->and($map['marks'][0]['count'])->toBe(1);
});

it('skips an empty moveto in the content but still counts it as a subpath', function (): void {
    $map = (new TqpSubpaths)->map(tqpFixtureSvg('', '<path d="M0 0 M5 5 L6 6"/>'), 1);

    expect($map['content'])->toBe([1])
        ->and($map['subpaths'])->toBe(2);
});

it('continues the numbering across content paths', function (): void {
    $map = (new TqpSubpaths)->map(tqpFixtureSvg('', '<path d="M0 0 L1 1"/><path d="M2 2 L3 3"/>'), 1);

    expect($map['content'])->toBe([0, 1])
        ->and($map['subpaths'])->toBe(2);
});

it('starts a new subpath after z with a relative m', function (): void {
    $map = (new TqpSubpaths)->map(tqpFixtureSvg('', '<path d="M0 0 L1 1 Z m2 2 L3 3"/>'), 1);

    expect($map['content'])->toBe([0, 1])
        ->and($map['subpaths'])->toBe(2);
});

it('does not count a moveto that is closed without drawing', function (): void {
    $map = (new TqpSubpaths)->map(tqpFixtureSvg('', '<path d="M0 0 Z M4 4 L5 5"/>'), 1);

    expect($map['content'])->toBe([1])
        ->and($map['subpaths'])->toBe(2);
});

it('throws when a path draws after z with no moveto, rather than guessing a subpath', function (): void {
    (new TqpSubpaths)->map(tqpFixtureSvg('', '<path d="M0 0 L1 1 Z L3 3"/>'), 7);
})->throws(SvgMushafSourceException::class, 'Page 7: a path draws after Z or before its first moveto');
