<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Validation\Rules;

use App\Domains\Seerah\Dataset\PlaceTree;
use App\Domains\Seerah\Enums\PlaceKind;
use App\Domains\Seerah\Validation\IssueBag;
use App\Domains\Seerah\Validation\ValidationContext;

/**
 * V4: every place id referenced anywhere exists; the place `other` exists; parents exist, the tree has no cycle, and the kinds nest
 * region > city > landmark (a region's parent is a region or nothing; a city's parent is a region; a landmark's is a city or region).
 */
final class V4PlaceTree implements ValidationRule
{
    public function check(ValidationContext $context, IssueBag $issues): void
    {
        $gazetteer = $context->data->gazetteer;

        if ($gazetteer === null) {
            return;
        }

        $tree = new PlaceTree($gazetteer->places);

        if (! $tree->has('other')) {
            $issues->error('V4', 'gazetteer', 'the place other is missing');
        }

        foreach ($gazetteer->places as $place) {
            $where = 'gazetteer '.$place->id;

            if ($place->parent === null) {
                if ($place->kind !== PlaceKind::Region) {
                    $issues->error('V4', $where, 'only a region may have no parent');
                }

                continue;
            }

            $parent = $tree->get($place->parent);

            if ($parent === null) {
                $issues->error('V4', $where, 'parent does not exist');

                continue;
            }

            if ($tree->isCyclic($place->id)) {
                $issues->error('V4', $where, 'the tree has a cycle');
            }

            $nests = match ($place->kind) {
                PlaceKind::Region => $parent->kind === PlaceKind::Region,
                PlaceKind::City => $parent->kind === PlaceKind::Region,
                PlaceKind::Landmark => $parent->kind === PlaceKind::City || $parent->kind === PlaceKind::Region,
            };

            if (! $nests) {
                $issues->error('V4', $where, 'the kind does not nest under its parent (region > city > landmark)');
            }
        }

        $this->references($context, $tree, $issues);
    }

    private function references(ValidationContext $context, PlaceTree $tree, IssueBag $issues): void
    {
        foreach ($context->data->allEvents() as $event) {
            $where = $event->batch.' '.$event->id;

            if ($event->place !== null) {
                $this->exists($tree, $event->place->id, $where, $issues);

                foreach ($event->place->also as $also) {
                    $this->exists($tree, $also, $where.' also', $issues);
                }
            }
        }

        foreach ($context->data->routes as $route) {
            foreach ($route->stops as $stop) {
                $this->exists($tree, $stop, 'route '.$route->id.' stop', $issues);
            }
        }

        foreach ($context->data->layouts as $layout) {
            $this->exists($tree, $layout->parentPlace, 'layout '.$layout->level.' parent', $issues);

            foreach ($layout->positions as $position) {
                $this->exists($tree, $position->place, 'layout '.$layout->level.' position', $issues);
            }
        }
    }

    private function exists(PlaceTree $tree, string $id, string $where, IssueBag $issues): void
    {
        if (! $tree->has($id)) {
            $issues->error('V4', $where, 'place id does not exist: '.$id);
        }
    }
}
