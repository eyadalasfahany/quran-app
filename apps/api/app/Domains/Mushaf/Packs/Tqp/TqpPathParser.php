<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Packs\Tqp;

use App\Domains\Mushaf\Exceptions\TqpEncodeException;

/**
 * SVG path data to absolute segments, as `abs_segments` in tqp.py: H, V, S and T are expanded, and the floating-point operations
 * run in the same order, so the encoded integers match the reference bit for bit.
 */
final class TqpPathParser
{
    private const string NUMBER = '[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?';

    private const string TOKEN = '/([MmLlHhVvCcSsQqTtAaZz])|('.self::NUMBER.')/';

    /** @var array<string, int> */
    private const array ARGUMENTS = ['m' => 2, 'l' => 2, 'h' => 1, 'v' => 1, 'c' => 6, 's' => 4, 'q' => 4, 't' => 2, 'z' => 0];

    /**
     * @return list<array{0: TqpCommand, 1: list<array{0: float, 1: float}>}>
     *
     * @throws TqpEncodeException for an arc, or for data that is not a path
     */
    public function segments(string $d): array
    {
        preg_match_all(self::TOKEN, $d, $matches);

        $tokens = [];

        foreach ($matches[1] as $index => $command) {
            $tokens[] = $command !== '' ? $command : (float) $matches[2][$index];
        }

        $count = count($tokens);
        $index = 0;
        $command = null;
        $cx = 0.0;
        $cy = 0.0;
        $sx = 0.0;
        $sy = 0.0;
        $previousCurve = null;
        $previousQuad = null;
        $segments = [];

        while ($index < $count) {
            if (is_string($tokens[$index])) {
                $command = $tokens[$index];
                $index++;
            }

            if ($command === null) {
                throw new TqpEncodeException('The path starts with a number, not a command.');
            }

            if ($command === 'A' || $command === 'a') {
                throw new TqpEncodeException('The path has an arc, which TQP1 does not encode.');
            }

            $lower = strtolower($command);
            $relative = $command === $lower;
            $size = self::ARGUMENTS[$lower];

            if ($lower === 'z') {
                if ($index < $count && ! is_string($tokens[$index])) {
                    throw new TqpEncodeException('The path has a number after Z.');
                }

                $segments[] = [TqpCommand::Z, []];
                $cx = $sx;
                $cy = $sy;
                $previousCurve = null;
                $previousQuad = null;

                continue;
            }

            if ($index + $size > $count) {
                throw new TqpEncodeException('The path ends inside a '.$command.' command.');
            }

            $a = [];

            for ($j = 0; $j < $size; $j++) {
                if (is_string($tokens[$index + $j])) {
                    throw new TqpEncodeException('The path has a command where '.$command.' needs a number.');
                }

                $a[] = $tokens[$index + $j];
            }

            $index += $size;
            [$bx, $by] = $relative ? [$cx, $cy] : [0.0, 0.0];
            $point = static fn (int $j): array => [$bx + $a[$j], $by + $a[$j + 1]];

            if ($lower === 'm') {
                $p = $point(0);
                $segments[] = [TqpCommand::M, [$p]];
                [$cx, $cy] = $p;
                [$sx, $sy] = $p;
                $previousCurve = null;
                $previousQuad = null;
                $command = $relative ? 'l' : 'L';

                continue;
            }

            if ($lower === 'l' || $lower === 'h' || $lower === 'v') {
                $p = match ($lower) {
                    'h' => [$bx + $a[0], $cy],
                    'v' => [$cx, $by + $a[0]],
                    default => $point(0),
                };
                $segments[] = [TqpCommand::L, [$p]];
                $previousCurve = null;
                $previousQuad = null;
            } elseif ($lower === 'c' || $lower === 's') {
                if ($lower === 'c') {
                    [$c1, $c2, $p] = [$point(0), $point(2), $point(4)];
                } else {
                    $c1 = $previousCurve !== null
                        ? [2 * $cx - $previousCurve[0], 2 * $cy - $previousCurve[1]]
                        : [$cx, $cy];
                    [$c2, $p] = [$point(0), $point(2)];
                }
                $segments[] = [TqpCommand::C, [$c1, $c2, $p]];
                $previousCurve = $c2;
                $previousQuad = null;
            } else {
                if ($lower === 'q') {
                    [$c1, $p] = [$point(0), $point(2)];
                } else {
                    $c1 = $previousQuad !== null
                        ? [2 * $cx - $previousQuad[0], 2 * $cy - $previousQuad[1]]
                        : [$cx, $cy];
                    $p = $point(0);
                }
                $segments[] = [TqpCommand::Q, [$c1, $p]];
                $previousQuad = $c1;
                $previousCurve = null;
            }

            [$cx, $cy] = $p;
        }

        return $segments;
    }
}
