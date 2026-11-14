<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Validation\Rules;

use App\Domains\Seerah\Dataset\DrawnLayout;
use App\Domains\Seerah\Dataset\EventRecord;
use App\Domains\Seerah\Dataset\MapPosition;
use App\Domains\Seerah\Dataset\Route;
use App\Domains\Seerah\Validation\IssueBag;
use App\Domains\Seerah\Validation\ValidationContext;

/**
 * V14: a route has at least two stops, each drawn on a map; its events exist and point back to it; each drawn curve belongs to an
 * existing route, joins two of its stops, and starts and ends on the drawn positions of those stops. A route's years are read from
 * its events, so there is no separate year to check.
 */
final class V14Routes implements ValidationRule
{
    private const float TOLERANCE = 0.5;

    public function check(ValidationContext $context, IssueBag $issues): void
    {
        $routes = [];

        foreach ($context->data->routes as $route) {
            $routes[$route->id] = $route;
            $where = 'route '.$route->id;

            if (count($route->stops) < 2) {
                $issues->error('V14', $where, 'a route needs at least two stops');
            }

            foreach ($route->stops as $stop) {
                if (! $this->drawnSomewhere($stop, $context)) {
                    $issues->error('V14', $where, 'stop '.$stop.' is not drawn on any map');
                }
            }

            foreach ($route->events as $eventId) {
                $event = $this->event($eventId, $context);

                if ($event === null) {
                    $issues->error('V14', $where, 'event does not exist: '.$eventId);
                } elseif ($event->route !== $route->id) {
                    $issues->error('V14', $where, 'event '.$eventId.' does not point back to this route');
                }
            }
        }

        foreach ($context->data->allEvents() as $event) {
            if ($event->route !== null && (! isset($routes[$event->route]) || ! in_array($event->id, $routes[$event->route]->events, true))) {
                $issues->error('V14', $event->batch.' '.$event->id, 'the event names a route that does not list it');
            }
        }

        foreach ($context->data->layouts as $layout) {
            foreach ($layout->routePaths as $path) {
                $this->curve($layout, $path->route, $path->segment, $path->d, $routes, $context, $issues);
            }
        }
    }

    /**
     * @param  array{string, string}  $segment
     * @param  array<string, Route>  $routes
     */
    private function curve(DrawnLayout $layout, string $routeId, array $segment, string $d, array $routes, ValidationContext $context, IssueBag $issues): void
    {
        $where = 'map layout '.$layout->level.' route '.$routeId;
        $route = $routes[$routeId] ?? null;

        if ($route === null) {
            $issues->error('V14', $where, 'the curve belongs to no route');

            return;
        }

        [$from, $to] = $segment;

        if (! in_array($from, $route->stops, true) || ! in_array($to, $route->stops, true)) {
            $issues->error('V14', $where, 'the curve joins a place that is not a stop of the route');

            return;
        }

        $start = $this->position($layout, $from);
        $end = $this->position($layout, $to);

        if ($start === null || $end === null) {
            $issues->error('V14', $where, 'a stop of the curve is not drawn on this map');

            return;
        }

        if (! preg_match_all('/-?\d+(?:\.\d+)?/', $d, $matches) || count($matches[0]) < 4) {
            $issues->error('V14', $where, 'the curve has fewer than two points');

            return;
        }

        $numbers = array_map(floatval(...), $matches[0]);
        $count = count($numbers);

        if (abs($numbers[0] - $start->x) > self::TOLERANCE || abs($numbers[1] - $start->y) > self::TOLERANCE) {
            $issues->error('V14', $where, 'the curve does not start on its first stop');
        }

        if (abs($numbers[$count - 2] - $end->x) > self::TOLERANCE || abs($numbers[$count - 1] - $end->y) > self::TOLERANCE) {
            $issues->error('V14', $where, 'the curve does not end on its second stop');
        }
    }

    private function position(DrawnLayout $layout, string $place): ?MapPosition
    {
        foreach ($layout->positions as $position) {
            if ($position->place === $place) {
                return $position;
            }
        }

        return null;
    }

    private function drawnSomewhere(string $place, ValidationContext $context): bool
    {
        foreach ($context->data->layouts as $layout) {
            if ($this->position($layout, $place) !== null) {
                return true;
            }
        }

        return false;
    }

    private function event(string $id, ValidationContext $context): ?EventRecord
    {
        foreach ($context->data->allEvents() as $event) {
            if ($event->id === $id) {
                return $event;
            }
        }

        return null;
    }
}
