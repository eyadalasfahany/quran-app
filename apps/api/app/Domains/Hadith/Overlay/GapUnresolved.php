<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Overlay;

/**
 * A number the measurement could not settle, with its fixed reason code (ADR 0076 gap report, step 6b.4). It never resolves anything.
 */
final readonly class GapUnresolved
{
    public function __construct(
        public string $number,
        public string $reason,
    ) {}
}
