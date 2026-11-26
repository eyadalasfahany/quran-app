<?php

declare(strict_types=1);

use App\Domains\Mushaf\Packs\Tqp\TqpEncoder;

const TQP_FIXTURES = __DIR__.'/../../../Fixtures/mushaf/tqp';

function tqpEncoderHeader(string $container): array
{
    return unpack('vn/Vcommands/Vvalues/Vescapes', substr($container, 4, 14));
}

it('writes the header fields of the container', function (): void {
    $container = (new TqpEncoder)->container(file_get_contents(TQP_FIXTURES.'/rounding.svg'));

    expect(substr($container, 0, 4))->toBe('TQP1')
        ->and(tqpEncoderHeader($container))->toBe(['n' => 32, 'commands' => 2, 'values' => 4, 'escapes' => 0])
        ->and(strlen($container))->toBe(18 + 2 + 4 + 4);
});

it('matches the container tqp.py writes, byte for byte', function (string $name): void {
    $container = (new TqpEncoder)->container(file_get_contents(TQP_FIXTURES.'/'.$name.'.svg'));

    expect($container)->toBe(file_get_contents(TQP_FIXTURES.'/'.$name.'.container.bin'));
})->with(['transforms', 'origin', 'paths', 'escape', 'rounding']);

it('rounds half toward +infinity on the 1/32 grid', function (): void {
    // 0.015625 is half a grid step: floor(0.5 + 0.5) = 1. -0.015625 gives floor(0) = 0. The body is cmds (M, L), then the lo
    // bytes (zigzag of 1, 0, 1, 0 = 2, 0, 2, 0), then the hi bytes (all 0).
    $body = substr((new TqpEncoder)->container(file_get_contents(TQP_FIXTURES.'/rounding.svg')), 18);

    expect(bin2hex($body))->toBe('0001'.'02000200'.'00000000');
});

it('escapes deltas of 0xFFFF and above, and records them as uint32', function (): void {
    $container = (new TqpEncoder)->container(file_get_contents(TQP_FIXTURES.'/escape.svg'));
    $body = substr($container, 18);
    $lo = substr($body, 3, 6);
    $hi = substr($body, 9, 6);
    $escapes = array_values(unpack('V*', substr($body, 15)));

    expect(tqpEncoderHeader($container)['escapes'])->toBe(2)
        ->and($escapes)->toBe([0xFFFF, 135936])
        ->and(ord($lo[2]))->toBe(0xFF)->and(ord($hi[2]))->toBe(0xFF)
        ->and(ord($lo[4]))->toBe(0xFF)->and(ord($hi[4]))->toBe(0xFF)
        ->and(ord($lo[0]))->toBe(0)->and(ord($lo[1]))->toBe(0);
});

it('stores a delta one below 0xFFFF in the planes, not in the escape list', function (): void {
    // -32767 steps is zigzag 65533: lo 0xFD, hi 0xFF. Escapes stay at zero.
    $svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 345 550"><!-- FIXTURE — not artwork -->'
        .'<g transform="translate(0 0)"><g id="content"><path d="M 0 0 L -1023.96875 0"/></g></g></svg>';
    $container = (new TqpEncoder)->container($svg);
    $body = substr($container, 18);

    // Two commands (M, L), so the lo plane starts at byte 2 and the hi plane at byte 6.
    expect(tqpEncoderHeader($container)['escapes'])->toBe(0)
        ->and(bin2hex(substr($body, 2, 4)))->toBe('00'.'00'.'fd'.'00')
        ->and(bin2hex(substr($body, 6, 4)))->toBe('00'.'00'.'ff'.'00');
});
