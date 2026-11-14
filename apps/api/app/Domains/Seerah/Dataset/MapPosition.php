<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Dataset;

/**
 * Where a place is drawn on one map, with its label priority (0 to 100) and the side its label goes to.
 */
final readonly class MapPosition
{
    public function __construct(
        public string $place,
        public float $x,
        public float $y,
        public int $labelPriority,
        public string $labelSide,
    ) {}
}
