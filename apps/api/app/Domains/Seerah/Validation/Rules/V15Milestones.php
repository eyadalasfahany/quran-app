<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Validation\Rules;

use App\Domains\Seerah\Validation\IssueBag;
use App\Domains\Seerah\Validation\ValidationContext;

/**
 * V15: the milestones are the six configured keys, each once, each pointing at an event with a dated year, in age order. With
 * --complete all six must exist.
 */
final class V15Milestones implements ValidationRule
{
    public function check(ValidationContext $context, IssueBag $issues): void
    {
        $seen = [];
        $previousAge = null;
        $events = [];

        foreach ($context->data->allEvents() as $event) {
            $events[$event->id] = $event;
        }

        foreach ($context->data->milestones as $milestone) {
            $where = 'milestones '.$milestone->key;

            if (! in_array($milestone->key, $context->milestoneKeys, true)) {
                $issues->error('V15', $where, 'the key is not one of the six milestones');
            }

            if (isset($seen[$milestone->key])) {
                $issues->error('V15', $where, 'the milestone is listed twice');
            }

            $seen[$milestone->key] = true;
            $event = $events[$milestone->event] ?? null;

            if ($event === null) {
                $issues->error('V15', $where, 'the event does not exist: '.$milestone->event);

                continue;
            }

            $age = $event->year?->ageFrom;

            if ($age === null) {
                $issues->error('V15', $where, 'the event has no dated year');

                continue;
            }

            if ($previousAge !== null && $age < $previousAge) {
                $issues->error('V15', $where, 'the milestones are not in age order');
            }

            $previousAge = $age;
        }

        $missing = array_values(array_diff($context->milestoneKeys, array_keys($seen)));

        if ($missing !== []) {
            if ($context->complete) {
                $issues->error('V15', 'milestones', 'missing milestone(s): '.implode(', ', $missing));
            } else {
                $issues->warning('V15', 'milestones', count($missing).' milestone(s) not yet set; errors with --complete');
            }
        }
    }
}
