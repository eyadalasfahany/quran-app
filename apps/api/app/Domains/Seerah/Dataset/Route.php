<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Dataset;

use App\Domains\Seerah\Enums\RouteKind;

/**
 * A journey drawn on the map: its stops (place ids in order), its events and the book's words naming it.
 *
 * @param  list<string>  $stops
 * @param  list<string>  $events
 * @param  list<Evidence>  $evidence
 */
final readonly class Route
{
    public function __construct(
        public string $id,
        public string $nameAr,
        public array $stops,
        public array $events,
        public array $evidence,
        public RouteKind $kind,
    ) {}
}
