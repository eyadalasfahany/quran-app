<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Packs\Tqp;

/**
 * The command byte of a TQP1 body (ADR 0090, amendment of 26 Nov 2026). The values are part of the format.
 */
enum TqpCommand: int
{
    case M = 0;
    case L = 1;
    case Q = 2;
    case C = 3;
    case Z = 4;

    public function points(): int
    {
        return match ($this) {
            self::M, self::L => 1,
            self::Q => 2,
            self::C => 3,
            self::Z => 0,
        };
    }
}
