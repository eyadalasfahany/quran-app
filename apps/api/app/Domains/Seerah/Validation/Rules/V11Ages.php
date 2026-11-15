<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Validation\Rules;

use App\Domains\Seerah\Dataset\AgeConvention;
use App\Domains\Seerah\Enums\YearBasis;
use App\Domains\Seerah\Validation\IssueBag;
use App\Domains\Seerah\Validation\ValidationContext;

/**
 * V11: ages are 0 to 63 and ordered; era and Hijri years agree with the age by the convention (Q6). A stated age's quote holds a digit
 * or an age word (warning, a heuristic).
 */
final class V11Ages implements ValidationRule
{
    public function check(ValidationContext $context, IssueBag $issues): void
    {
        foreach ($context->data->allEvents() as $event) {
            $year = $event->year;

            if ($year === null || $year->ageFrom === null || $year->ageTo === null) {
                continue;
            }

            $where = $event->batch.' '.$event->id.' year';

            foreach ([$year->ageFrom, $year->ageTo] as $age) {
                if ($age < $context->ageMin || $age > $context->ageMax) {
                    $issues->error('V11', $where, 'age is outside '.$context->ageMin.' to '.$context->ageMax);
                }
            }

            if ($year->ageFrom > $year->ageTo) {
                $issues->error('V11', $where, 'age_from is greater than age_to');
            }

            if ($year->era === null || $year->hijriFrom === null || $year->hijriTo === null) {
                $issues->error('V11', $where, 'era and Hijri years are required with an age');

                continue;
            }

            $from = AgeConvention::fromAge($year->ageFrom);
            $to = AgeConvention::fromAge($year->ageTo);

            if ($from['era'] !== $year->era || $from['hijri'] !== $year->hijriFrom || $to['era'] !== $year->era || $to['hijri'] !== $year->hijriTo) {
                $issues->error('V11', $where, 'era or Hijri years disagree with the age by the convention');
            }

            if ($year->basis === YearBasis::StatedAge && $year->evidence !== []) {
                $quote = $year->evidence[0]->quote;

                if (preg_match('/[0-9٠-٩]|سن|عمر/u', $quote) !== 1) {
                    $issues->warning('V11', $where, 'the quote of a stated age has no digit or age word');
                }
            }
        }
    }
}
