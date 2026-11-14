<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Validation\Rules;

use App\Domains\Seerah\Dataset\Evidence;
use App\Domains\Seerah\Validation\ValidationContext;

/**
 * Every quote in the data, with the place it sits in, for the rules that check quotes (V3 and the rest).
 */
final class Evidences
{
    /**
     * @return list<array{where: string, evidence: Evidence}>
     */
    public static function all(ValidationContext $context): array
    {
        $all = [];

        foreach ($context->data->gazetteer?->places ?? [] as $place) {
            foreach ($place->evidence as $evidence) {
                $all[] = ['where' => 'gazetteer '.$place->id, 'evidence' => $evidence];
            }
        }

        foreach ($context->data->allEvents() as $event) {
            foreach ($event->place?->evidence ?? [] as $evidence) {
                $all[] = ['where' => $event->id.' place', 'evidence' => $evidence];
            }

            foreach ($event->year?->evidence ?? [] as $evidence) {
                $all[] = ['where' => $event->id.' year', 'evidence' => $evidence];
            }
        }

        foreach ($context->data->routes as $route) {
            foreach ($route->evidence as $evidence) {
                $all[] = ['where' => 'route '.$route->id, 'evidence' => $evidence];
            }
        }

        return $all;
    }
}
