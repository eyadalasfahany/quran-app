<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Dataset;

/**
 * Where a place is drawn on one map, with its label priority (0 to 100) and the side its label goes to. `artLandmark`: the
 * place's own marker (a mosque, the Kaaba) is drawn in the level's art at this position, so a cluster that holds it is drawn
 * there (ADR 0089, amendment).
 */
final readonly class MapPosition
{
    public function __construct(
        public string $place,
        public float $x,
        public float $y,
        public int $labelPriority,
        public string $labelSide,
        public bool $artLandmark = false,
    ) {}
}
