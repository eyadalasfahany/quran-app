<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Validation\Rules;

use App\Domains\Seerah\Validation\IssueBag;
use App\Domains\Seerah\Validation\ValidationContext;

/**
 * V10 (release): every record with an open flag, and every event the book tells out of order, has the developer's decision in its
 * group's sign-off, covering each of its flag codes. Structure mode only counts the open flags.
 */
final class V10Decisions implements ValidationRule
{
    public function check(ValidationContext $context, IssueBag $issues): void
    {
        $open = 0;

        $records = [];

        foreach ($context->data->gazetteer->places ?? [] as $place) {
            $records[] = ['G', 'gazetteer '.$place->id, $place->id, $place->flags, false];
        }

        foreach ($context->data->allEvents() as $event) {
            $records[] = [$event->batch, $event->batch.' '.$event->id, $event->id, $event->flags, $event->orderException !== null];
        }

        foreach ($records as [$group, $where, $id, $flags, $orderException]) {
            if ($flags === [] && ! $orderException) {
                continue;
            }

            $open++;

            if (! $context->release) {
                continue;
            }

            $decision = $context->data->signOffs[$group]->decisions[$id] ?? null;

            if ($decision === null) {
                $issues->error('V10', $where, 'no developer decision in the sign-off of '.$group);

                continue;
            }

            foreach ($flags as $flag) {
                if (! in_array($flag->code, $decision->codes, true)) {
                    $issues->error('V10', $where, 'the decision does not settle the flag '.$flag->code->value);
                }
            }
        }

        $issues->info('V10', 'flags', $open.' record(s) with an open flag or an order exception');
    }
}
