<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Dataset;

use App\Domains\Seerah\Enums\GeoPrecision;

/**
 * A real-world coordinate with its source (`wikidata:Q…` or `manual`). `box` (south, west, north, east) is set on a region only, so
 * its cities can be checked against it (V6).
 */
final readonly class Geo
{
    /**
     * @param  array{float, float, float, float}|null  $box
     */
    public function __construct(
        public float $lat,
        public float $lng,
        public GeoPrecision $precision,
        public string $source,
        public ?array $box,
        public ?string $note,
    ) {}
}
