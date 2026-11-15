<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Dataset;

/**
 * The gazetteer as a tree: the ancestors of each place and the names of each place's subtree (the place and its descendants).
 * Built over a list of places that may hold errors (unknown parents, cycles); walks stop at the first repeat.
 */
final class PlaceTree
{
    /** @var array<string, Place> */
    private array $places = [];

    /**
     * @param  list<Place>  $places
     */
    public function __construct(array $places)
    {
        foreach ($places as $place) {
            $this->places[$place->id] = $place;
        }
    }

    public function has(string $id): bool
    {
        return isset($this->places[$id]);
    }

    public function get(string $id): ?Place
    {
        return $this->places[$id] ?? null;
    }

    /**
     * The ids of the place's ancestors, nearest first, stopping at a cycle or an unknown parent.
     *
     * @return list<string>
     */
    public function ancestors(string $id): array
    {
        $chain = [];
        $seen = [$id => true];
        $current = $this->places[$id] ?? null;

        while ($current !== null && $current->parent !== null) {
            if (isset($seen[$current->parent])) {
                break;
            }

            $seen[$current->parent] = true;
            $chain[] = $current->parent;
            $current = $this->places[$current->parent] ?? null;
        }

        return $chain;
    }

    /**
     * Whether following the parents from this place returns to a place already seen.
     */
    public function isCyclic(string $id): bool
    {
        $seen = [$id => true];
        $current = $this->places[$id] ?? null;

        while ($current !== null && $current->parent !== null) {
            if (isset($seen[$current->parent])) {
                return true;
            }

            $seen[$current->parent] = true;
            $current = $this->places[$current->parent] ?? null;
        }

        return false;
    }

    /**
     * Whether the place is `ancestor` or sits under it.
     */
    public function isWithin(string $id, string $ancestor): bool
    {
        return $id === $ancestor || in_array($ancestor, $this->ancestors($id), true);
    }

    /**
     * The names a quote may use for this place: its own name and the names of everything under it.
     *
     * @return list<string>
     */
    public function namesOfSubtree(string $id): array
    {
        $names = [];

        foreach ($this->places as $place) {
            if (! $this->isWithin($place->id, $id)) {
                continue;
            }

            $names[] = $place->nameAr;
            array_push($names, ...$place->namesInBook);
        }

        return array_values(array_unique($names));
    }
}
