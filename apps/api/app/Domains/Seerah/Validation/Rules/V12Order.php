<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Validation\Rules;

use App\Domains\Seerah\Dataset\AgeConvention;
use App\Domains\Seerah\Dataset\EventRecord;
use App\Domains\Seerah\Enums\Era;
use App\Domains\Seerah\Validation\IssueBag;
use App\Domains\Seerah\Validation\ValidationContext;

/**
 * V12: dated events in book order have non-decreasing ages, and an event under a year heading holds that year. An event with an order
 * exception (the book tells it out of time order) is exempt from both checks. The year bucket is ignored.
 */
final class V12Order implements ValidationRule
{
    public function check(ValidationContext $context, IssueBag $issues): void
    {
        $events = [];

        foreach ($context->data->allEvents() as $event) {
            $position = $context->index->sectionPosition($event->section);

            if ($position === null) {
                continue;
            }

            $indices = $context->index->coveredIndices($event->section, $event->span);
            $events[] = [$position, $indices[0] ?? -1, $event->id, $event];
        }

        usort($events, static fn (array $a, array $b): int => [$a[0], $a[1], $a[2]] <=> [$b[0], $b[1], $b[2]]);

        $previous = null;

        foreach ($events as [, , , $event]) {
            if ($event->year === null || $event->year->ageFrom === null || $event->orderException !== null) {
                continue;
            }

            $where = $event->batch.' '.$event->id;

            if ($previous !== null && $event->year->ageFrom < $previous) {
                $issues->error('V12', $where, 'the event is older than the one before it in book order (add an order exception if the book tells it out of order)');
            }

            $previous = $event->year->ageFrom;

            $this->heading($event, $context, $issues);
        }
    }

    private function heading(EventRecord $event, ValidationContext $context, IssueBag $issues): void
    {
        $year = $context->index->yearOf($event->section);

        if ($year === null || $event->year === null || $event->year->ageFrom === null || $event->year->ageTo === null) {
            return;
        }

        $expected = AgeConvention::ageOf(Era::AfterHijra, $year);

        if ($event->year->ageFrom !== $expected || $event->year->ageTo !== $expected) {
            $issues->error('V12', $event->batch.' '.$event->id, 'the event is not in the year of its heading');
        }
    }
}
