<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Dataset;

/**
 * One drawn map (map/layout.<level>.json): the viewbox, the art it belongs to, the drawn pins and the route curves.
 *
 * @param  array{float, float, float, float}  $viewbox  x, y, width, height
 * @param  list<MapPosition>  $positions
 * @param  list<RoutePath>  $routePaths
 */
final readonly class DrawnLayout
{
    public function __construct(
        public string $level,
        public string $parentPlace,
        public array $viewbox,
        public string $art,
        public array $positions,
        public array $routePaths,
    ) {}
}
