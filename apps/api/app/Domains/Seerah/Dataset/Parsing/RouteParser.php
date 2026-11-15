<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Dataset\Parsing;

use App\Domains\Seerah\Dataset\Route;
use App\Domains\Seerah\Enums\RouteKind;
use App\Domains\Seerah\Validation\IssueBag;

/**
 * Parses routes.json (data-format.md, `routes.json`).
 */
final class RouteParser
{
    private const array FILE_KEYS = ['format', 'routes'];

    private const array ROUTE_KEYS = ['id', 'name_ar', 'stops', 'events', 'evidence', 'kind'];

    /**
     * @param  array<array-key, mixed>  $decoded
     * @return list<Route>
     */
    public function parse(array $decoded, string $where, IssueBag $issues): array
    {
        FragmentParser::checkFormat($decoded, $where, $issues);
        $reader = new RecordReader($decoded, $where, 'V14', $issues);
        $reader->expectKeys(self::FILE_KEYS);

        return $reader->objectList('routes', function (array $item, string $at) use ($issues): Route {
            $route = new RecordReader($item, $at, 'V14', $issues);
            $route->expectKeys(self::ROUTE_KEYS);
            $kind = $route->enumOf('kind', RouteKind::class, RouteKind::Trip);

            return new Route(
                id: $route->string('id'),
                nameAr: $route->string('name_ar'),
                stops: $route->stringList('stops'),
                events: $route->stringList('events'),
                evidence: FragmentParser::evidence($route, 'evidence'),
                kind: $kind,
            );
        });
    }
}
