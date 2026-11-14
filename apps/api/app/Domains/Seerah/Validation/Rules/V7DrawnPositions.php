<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Validation\Rules;

use App\Domains\Seerah\Dataset\DrawnLayout;
use App\Domains\Seerah\Dataset\PlaceTree;
use App\Domains\Seerah\Validation\IssueBag;
use App\Domains\Seerah\Validation\ValidationContext;

/**
 * V7: every place used by an event is drawn on a map that shows it; every drawn position lies inside its viewbox, its label priority is
 * 0 to 100 and its label side is known; two places with coordinates keep their compass order on the drawing (north, south, east,
 * west) with a margin of 0.05 degrees.
 */
final class V7DrawnPositions implements ValidationRule
{
    private const float COMPASS_MARGIN = 0.05;

    private const array LABEL_SIDES = ['start', 'end', 'top', 'bottom'];

    public function check(ValidationContext $context, IssueBag $issues): void
    {
        $gazetteer = $context->data->gazetteer;

        foreach ($context->data->layouts as $layout) {
            $this->layout($layout, $context, $issues);
        }

        if ($gazetteer === null) {
            return;
        }

        $tree = new PlaceTree($gazetteer->places);

        foreach ($context->data->allEvents() as $event) {
            $place = $event->place?->id;

            if ($place === null || $place === 'other' || ! $tree->has($place)) {
                continue;
            }

            if (! $this->drawn($place, $tree, $context)) {
                $issues->error('V7', $event->batch.' '.$event->id, 'place '.$place.' is not drawn on any map');
            }
        }
    }

    private function drawn(string $place, PlaceTree $tree, ValidationContext $context): bool
    {
        $parent = $tree->get($place)?->parent;

        foreach ($context->data->layouts as $layout) {
            if ($layout->parentPlace === $place || ($parent !== null && $layout->parentPlace === $parent)) {
                foreach ($layout->positions as $position) {
                    if ($position->place === $place) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    private function layout(DrawnLayout $layout, ValidationContext $context, IssueBag $issues): void
    {
        [$x, $y, $width, $height] = $layout->viewbox;
        $where = 'map layout '.$layout->level;

        if ($width <= 0 || $height <= 0) {
            $issues->error('V7', $where, 'viewbox has no area');
        }

        $seen = [];
        $placed = [];

        foreach ($layout->positions as $position) {
            $at = $where.' '.$position->place;

            if (isset($seen[$position->place])) {
                $issues->error('V7', $at, 'place is drawn twice on this map');
            }

            $seen[$position->place] = true;

            if ($position->x < $x || $position->x > $x + $width || $position->y < $y || $position->y > $y + $height) {
                $issues->error('V7', $at, 'drawn position lies outside the viewbox');
            }

            if ($position->labelPriority < 0 || $position->labelPriority > 100) {
                $issues->error('V7', $at, 'label priority must be 0 to 100');
            }

            if (! in_array($position->labelSide, self::LABEL_SIDES, true)) {
                $issues->error('V7', $at, 'label side is unknown');
            }

            $geo = $context->data->gazetteer?->places;
            foreach ($geo ?? [] as $place) {
                if ($place->id === $position->place && $place->geo !== null) {
                    $placed[] = [$position, $place->geo->lat, $place->geo->lng];
                }
            }
        }

        $this->compass($placed, $where, $issues);
    }

    /**
     * @param  list<array{0: \App\Domains\Seerah\Dataset\MapPosition, 1: float, 2: float}>  $placed
     */
    private function compass(array $placed, string $where, IssueBag $issues): void
    {
        foreach ($placed as $i => [$a, $aLat, $aLng]) {
            foreach (array_slice($placed, $i + 1) as [$b, $bLat, $bLng]) {
                $this->pair($a, $aLat, $aLng, $b, $bLat, $bLng, $where, $issues);
            }
        }
    }

    private function pair(
        \App\Domains\Seerah\Dataset\MapPosition $a,
        float $aLat,
        float $aLng,
        \App\Domains\Seerah\Dataset\MapPosition $b,
        float $bLat,
        float $bLng,
        string $where,
        IssueBag $issues,
    ): void {
        $dLat = $aLat - $bLat;
        $dLng = $aLng - $bLng;
        $dx = $a->x - $b->x;
        $dy = $a->y - $b->y;

        // A place further north has a smaller y on the drawing; further east a larger x.
        if (abs($dLat) > self::COMPASS_MARGIN && abs($dy) > 0 && (($dLat > 0) !== ($dy < 0))) {
            $issues->error('V7', $where.' '.$a->place.' / '.$b->place, 'north and south are drawn the other way round');
        }

        if (abs($dLng) > self::COMPASS_MARGIN && abs($dx) > 0 && (($dLng > 0) !== ($dx > 0))) {
            $issues->error('V7', $where.' '.$a->place.' / '.$b->place, 'east and west are drawn the other way round');
        }
    }
}
