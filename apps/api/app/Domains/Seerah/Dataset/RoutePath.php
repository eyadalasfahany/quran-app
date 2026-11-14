<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Dataset;

/**
 * The drawn curve of one segment of a route, between two stops (V14 checks its end points).
 *
 * @param  array{string, string}  $segment
 */
final readonly class RoutePath
{
    public function __construct(
        public string $route,
        public array $segment,
        public string $d,
    ) {}
}
