<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Dataset\Parsing;

use App\Domains\Seerah\Dataset\DrawnLayout;
use App\Domains\Seerah\Dataset\MapPosition;
use App\Domains\Seerah\Dataset\RoutePath;
use App\Domains\Seerah\Validation\IssueBag;

/**
 * Parses map/layout.<level>.json (data-format.md, `map/layout.<level>.json`).
 */
final class LayoutParser
{
    private const array KEYS = ['format', 'level', 'parent_place', 'viewbox', 'art', 'positions', 'route_paths'];

    private const array POSITION_KEYS = ['place', 'x', 'y', 'label_priority', 'label_side'];

    private const array ROUTE_PATH_KEYS = ['route', 'segment', 'd'];

    /**
     * @param  array<array-key, mixed>  $decoded
     */
    public function parse(array $decoded, string $where, IssueBag $issues): ?DrawnLayout
    {
        FragmentParser::checkFormat($decoded, $where, $issues);
        $reader = new RecordReader($decoded, $where, 'V7', $issues);
        $reader->expectKeys(self::KEYS);
        $viewbox = $this->viewbox($decoded['viewbox'] ?? null, $where, $issues);

        if ($viewbox === null) {
            return null;
        }

        return new DrawnLayout(
            level: $reader->string('level'),
            parentPlace: $reader->string('parent_place'),
            viewbox: $viewbox,
            art: $reader->string('art'),
            positions: $reader->objectList('positions', function (array $item, string $at) use ($issues): MapPosition {
                $position = new RecordReader($item, $at, 'V7', $issues);
                $position->expectKeys(self::POSITION_KEYS);

                return new MapPosition(
                    place: $position->string('place'),
                    x: $position->float('x'),
                    y: $position->float('y'),
                    labelPriority: $position->int('label_priority'),
                    labelSide: $position->string('label_side'),
                );
            }),
            routePaths: $reader->objectList('route_paths', function (array $item, string $at) use ($issues): RoutePath {
                $path = new RecordReader($item, $at, 'V14', $issues);
                $path->expectKeys(self::ROUTE_PATH_KEYS);
                $segment = $path->stringList('segment');

                return new RoutePath(
                    route: $path->string('route'),
                    segment: [$segment[0] ?? '', $segment[1] ?? ''],
                    d: $path->string('d'),
                );
            }),
        );
    }

    /**
     * @return array{float, float, float, float}|null
     */
    private function viewbox(mixed $value, string $where, IssueBag $issues): ?array
    {
        if (! is_array($value) || count($value) !== 4 || ! array_is_list($value) || ! array_all($value, static fn (mixed $item): bool => is_numeric($item))) {
            $issues->error('V7', $where, 'viewbox must be four numbers: x, y, width, height');

            return null;
        }

        return [(float) $value[0], (float) $value[1], (float) $value[2], (float) $value[3]];
    }
}
