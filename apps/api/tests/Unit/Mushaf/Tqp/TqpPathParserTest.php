<?php

declare(strict_types=1);

use App\Domains\Mushaf\Exceptions\TqpEncodeException;
use App\Domains\Mushaf\Packs\Tqp\TqpCommand;
use App\Domains\Mushaf\Packs\Tqp\TqpPathParser;

it('expands path data to absolute segments as tqp.py does', function (string $d, array $expected): void {
    expect((new TqpPathParser)->segments($d))->toEqual($expected);
})->with([
    'absolute M L H V' => ['M 0 0 L 10 0 H 20 V 30', [
        [TqpCommand::M, [[0.0, 0.0]]], [TqpCommand::L, [[10.0, 0.0]]], [TqpCommand::L, [[20.0, 0.0]]], [TqpCommand::L, [[20.0, 30.0]]],
    ]],
    'relative m l h v' => ['m 1 1 l 2 2 h 3 v 4', [
        [TqpCommand::M, [[1.0, 1.0]]], [TqpCommand::L, [[3.0, 3.0]]], [TqpCommand::L, [[6.0, 3.0]]], [TqpCommand::L, [[6.0, 7.0]]],
    ]],
    'absolute C' => ['M 0 0 C 1 2 3 4 5 6', [
        [TqpCommand::M, [[0.0, 0.0]]], [TqpCommand::C, [[1.0, 2.0], [3.0, 4.0], [5.0, 6.0]]],
    ]],
    'relative c uses the segment start for all three points' => ['M 1 1 c 1 0 2 0 3 0', [
        [TqpCommand::M, [[1.0, 1.0]]], [TqpCommand::C, [[2.0, 1.0], [3.0, 1.0], [4.0, 1.0]]],
    ]],
    'implicit l after relative m' => ['m 1 1 2 2', [
        [TqpCommand::M, [[1.0, 1.0]]], [TqpCommand::L, [[3.0, 3.0]]],
    ]],
    'implicit L after absolute M' => ['M 1 1 2 2', [
        [TqpCommand::M, [[1.0, 1.0]]], [TqpCommand::L, [[2.0, 2.0]]],
    ]],
    'S reflects the previous curve' => ['M 0 0 C 1 1 2 2 3 3 S 5 5 6 6', [
        [TqpCommand::M, [[0.0, 0.0]]],
        [TqpCommand::C, [[1.0, 1.0], [2.0, 2.0], [3.0, 3.0]]],
        [TqpCommand::C, [[4.0, 4.0], [5.0, 5.0], [6.0, 6.0]]],
    ]],
    'S without a previous curve starts at the current point' => ['M 1 1 S 2 2 3 3', [
        [TqpCommand::M, [[1.0, 1.0]]], [TqpCommand::C, [[1.0, 1.0], [2.0, 2.0], [3.0, 3.0]]],
    ]],
    'T reflects the previous quadratic control' => ['M 0 0 Q 1 1 2 0 T 4 0', [
        [TqpCommand::M, [[0.0, 0.0]]], [TqpCommand::Q, [[1.0, 1.0], [2.0, 0.0]]], [TqpCommand::Q, [[3.0, -1.0], [4.0, 0.0]]],
    ]],
    'T without a previous quadratic starts at the current point' => ['M 0 0 T 4 0', [
        [TqpCommand::M, [[0.0, 0.0]]], [TqpCommand::Q, [[0.0, 0.0], [4.0, 0.0]]],
    ]],
    'Z returns to the subpath start, then relative m moves from it' => ['M 1 1 L 5 5 Z m 2 2 L 0 0', [
        [TqpCommand::M, [[1.0, 1.0]]], [TqpCommand::L, [[5.0, 5.0]]], [TqpCommand::Z, []],
        [TqpCommand::M, [[3.0, 3.0]]], [TqpCommand::L, [[0.0, 0.0]]],
    ]],
    'scientific notation' => ['M 1e2 -2.5E-1', [[TqpCommand::M, [[100.0, -0.25]]]]],
    'numbers glued by a minus sign' => ['M 1-2 3-4', [
        [TqpCommand::M, [[1.0, -2.0]]], [TqpCommand::L, [[3.0, -4.0]]],
    ]],
]);

it('refuses what tqp.py cannot read', function (string $d): void {
    expect(fn () => (new TqpPathParser)->segments($d))->toThrow(TqpEncodeException::class);
})->with([
    'an arc' => ['M 0 0 A 1 1 0 0 1 5 5'],
    'a relative arc' => ['M 0 0 a 1 1 0 0 1 5 5'],
    'a number before any command' => ['1 2 L 3 4'],
    'too few arguments' => ['M 0 0 L 1'],
    'a command where a number belongs' => ['M 0 0 L 1 L 2 3'],
    'a number after Z' => ['M 0 0 Z 5 5'],
]);
