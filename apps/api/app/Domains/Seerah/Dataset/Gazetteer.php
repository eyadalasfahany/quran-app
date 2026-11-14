<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Dataset;

/**
 * gazetteer.json: every place, with the canonical text SHA-256 it was drafted against.
 *
 * @param  list<Place>  $places
 */
final readonly class Gazetteer
{
    public function __construct(
        public string $sourceSha256,
        public array $places,
    ) {}
}
