<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Overlay;

/**
 * A hadith number whose text already sits inside a neighbouring row (ADR 0076 decision 2, step 6b.3). The number has no row;
 * it resolves to the covering row named by $into.
 */
final readonly class GapMerge
{
    public function __construct(
        public string $number,
        public string $into,
        public string $origin,
    ) {}
}
