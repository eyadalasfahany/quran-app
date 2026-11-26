<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Packs\Tqp;

use App\Domains\Mushaf\Exceptions\TqpEncodeException;

/**
 * Encodes one page to its TQP1 container: an 18-byte header and an uncompressed body (ADR 0090 amendment of 26 Nov 2026). The
 * reference is tqp.py `container()`; the bytes must match it exactly. Quantisation is floor(v * N + 0.5), never round().
 */
final class TqpEncoder
{
    public const int GRID = 32;

    public const int HEADER_BYTES = 18;

    private const int LIMIT_32_BITS = 4294967296;

    private const int ESCAPE = 0xFFFF;

    public function __construct(
        private readonly TqpPageScope $scope = new TqpPageScope,
        private readonly TqpPathParser $paths = new TqpPathParser,
    ) {}

    /**
     * @throws TqpEncodeException
     */
    public function container(string $svg, int $n = self::GRID): string
    {
        $commands = '';
        $lo = '';
        $hi = '';
        $escapes = '';
        $commandCount = 0;
        $valueCount = 0;
        $escapeCount = 0;
        $cx = 0;
        $cy = 0;
        $sx = 0;
        $sy = 0;

        foreach ($this->scope->pieces($svg) as $piece) {
            [$a, $b, $c, $d, $e, $f] = $piece['m'];

            foreach ($this->paths->segments($piece['d']) as [$command, $points]) {
                $commands .= chr($command->value);
                $commandCount++;
                $quantised = [];

                foreach ($points as [$x, $y]) {
                    $vx = $a * $x + $c * $y + $e;
                    $vy = $b * $x + $d * $y + $f;
                    $quantised[] = [(int) floor($vx * $n + 0.5), (int) floor($vy * $n + 0.5)];
                }

                foreach ($quantised as [$X, $Y]) {
                    foreach ([$X - $cx, $Y - $cy] as $delta) {
                        $u = $delta >= 0 ? 2 * $delta : -2 * $delta - 1;

                        if ($u >= self::LIMIT_32_BITS) {
                            throw new TqpEncodeException('A delta needs more than 32 bits.');
                        }

                        $valueCount++;

                        if ($u >= self::ESCAPE) {
                            $lo .= "\xFF";
                            $hi .= "\xFF";
                            $escapes .= pack('V', $u);
                            $escapeCount++;
                        } else {
                            $lo .= chr($u & 0xFF);
                            $hi .= chr($u >> 8);
                        }
                    }
                }

                if ($command === TqpCommand::Z) {
                    $cx = $sx;
                    $cy = $sy;
                } else {
                    [$cx, $cy] = $quantised[count($quantised) - 1];

                    if ($command === TqpCommand::M) {
                        $sx = $cx;
                        $sy = $cy;
                    }
                }
            }
        }

        return 'TQP1'
            .pack('vVVV', $n, $commandCount, $valueCount, $escapeCount)
            .$commands.$lo.$hi.$escapes;
    }
}
