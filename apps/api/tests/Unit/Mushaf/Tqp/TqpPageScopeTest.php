<?php

declare(strict_types=1);

use App\Domains\Mushaf\Exceptions\TqpEncodeException;
use App\Domains\Mushaf\Packs\Tqp\TqpPageScope;

/** A synthetic page (FIXTURE — not artwork) with the given body inside the root group. */
function tqpScopePage(string $body, string $viewBox = '0 0 345 550'): string
{
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'.$viewBox.'"><!-- FIXTURE — not artwork -->'
        .'<g transform="translate(0 0)">'.$body.'</g></svg>';
}

it('multiplies nested transforms down the tree', function (string $transform, array $expected): void {
    $svg = tqpScopePage('<g id="content"><g transform="'.$transform.'"><path d="M 0 0"/></g></g>');

    expect((new TqpPageScope)->pieces($svg))->toBe([['d' => 'M 0 0', 'm' => $expected, 'section' => 'content', 'group' => null]]);
})->with([
    'translate' => ['translate(3 4)', [1.0, 0.0, 0.0, 1.0, 3.0, 4.0]],
    'translate with two arguments' => ['translate(1 2)', [1.0, 0.0, 0.0, 1.0, 1.0, 2.0]],
    'scale(1)' => ['scale(1)', [1.0, 0.0, 0.0, 1.0, 0.0, 0.0]],
    'scale(sx, sy)' => ['scale(2, 3)', [2.0, 0.0, 0.0, 3.0, 0.0, 0.0]],
    'matrix' => ['matrix(1 0 0 1 3 4)', [1.0, 0.0, 0.0, 1.0, 3.0, 4.0]],
    'two functions, left to right' => ['translate(1 2) scale(0.5, 0.25)', [0.5, 0.0, 0.0, 0.25, 1.0, 2.0]],
]);

it('nests a group inside another transformed group', function (): void {
    $svg = tqpScopePage('<g id="content"><g transform="translate(10 20)"><g transform="translate(1 2)"><path d="M 0 0"/></g></g></g>');

    expect((new TqpPageScope)->pieces($svg))->toBe([['d' => 'M 0 0', 'm' => [1.0, 0.0, 0.0, 1.0, 11.0, 22.0], 'section' => 'content', 'group' => null]]);
});

it('bakes a non-zero viewBox origin into every matrix', function (): void {
    $svg = tqpScopePage('<g id="content"><path d="M 10 20"/></g>', '10 20 345 550');

    expect((new TqpPageScope)->pieces($svg))->toBe([['d' => 'M 10 20', 'm' => [1.0, 0.0, 0.0, 1.0, -10.0, -20.0], 'section' => 'content', 'group' => null]]);
});

it('draws a path inside an ayah-mark group under #ayah_markers, and nothing else there', function (): void {
    $svg = tqpScopePage(
        '<g id="ayah_markers"><g class="ayah-mark"><path d="M 1 1"/></g>'
        .'<path d="M 2 2"/><path class="ayah-mark" d="M 3 3"/></g>'
        .'<g id="content"><path d="M 4 4"/></g>'
    );

    expect(array_column((new TqpPageScope)->pieces($svg), 'd'))->toBe(['M 1 1', 'M 4 4']);
});

it('reads the raw viewBox origin, zero when the viewBox starts at 0 0', function (): void {
    expect((new TqpPageScope)->viewBoxOrigin(tqpScopePage('<g id="content"><path d="M 0 0"/></g>', '-10.5 -20.25 345 550')))->toBe([-10.5, -20.25])
        ->and((new TqpPageScope)->viewBoxOrigin(tqpScopePage('<g id="content"><path d="M 0 0"/></g>')))->toBe([0.0, 0.0]);
});

it('refuses a page that is not 345 by 550', function (): void {
    expect(fn () => (new TqpPageScope)->pieces(tqpScopePage('<g id="content"><path d="M 0 0"/></g>', '0 0 300 550')))
        ->toThrow(TqpEncodeException::class, 'viewBox');
});

it('refuses a rotate transform', function (): void {
    $svg = tqpScopePage('<g id="content"><g transform="rotate(45)"><path d="M 0 0"/></g></g>');

    expect(fn () => (new TqpPageScope)->pieces($svg))->toThrow(TqpEncodeException::class, 'rotate');
});

it('refuses a page with no transformed group holding the content', function (): void {
    $svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 345 550"><g id="content"><path d="M 0 0"/></g></svg>';

    expect(fn () => (new TqpPageScope)->pieces($svg))->toThrow(TqpEncodeException::class);
});

it('refuses malformed XML', function (): void {
    expect(fn () => (new TqpPageScope)->pieces('<svg viewBox="0 0 345 550">'))->toThrow(TqpEncodeException::class, 'well-formed');
});
