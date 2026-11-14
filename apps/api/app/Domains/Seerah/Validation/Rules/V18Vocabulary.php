<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Validation\Rules;

use App\Domains\Seerah\Dataset\Flag;
use App\Domains\Seerah\Enums\FlagCode;
use App\Domains\Seerah\Validation\IssueBag;
use App\Domains\Seerah\Validation\ValidationContext;

/**
 * V18: every record has an origin (the parser reports an unknown value), and every flag is allowed on its kind of record and appears
 * once. Place flags: not_in_book_directly, disputed_location, approximate_location. Event flags: all the others.
 */
final class V18Vocabulary implements ValidationRule
{
    private const array PLACE_FLAGS = [FlagCode::NotInBookDirectly, FlagCode::DisputedLocation, FlagCode::ApproximateLocation];

    public function check(ValidationContext $context, IssueBag $issues): void
    {
        foreach ($context->data->gazetteer?->places ?? [] as $place) {
            $this->flags($place->flags, 'gazetteer '.$place->id, true, $issues);
        }

        foreach ($context->data->allEvents() as $event) {
            $this->flags($event->flags, $event->batch.' '.$event->id, false, $issues);
        }
    }

    /**
     * @param  list<Flag>  $flags
     */
    private function flags(array $flags, string $where, bool $isPlace, IssueBag $issues): void
    {
        $seen = [];

        foreach ($flags as $flag) {
            $allowed = $isPlace ? in_array($flag->code, self::PLACE_FLAGS, true) : ! in_array($flag->code, [FlagCode::NotInBookDirectly, FlagCode::ApproximateLocation], true);

            if (! $allowed) {
                $issues->error('V18', $where, 'the flag '.$flag->code->value.' is not allowed on this kind of record');
            }

            if (isset($seen[$flag->code->value])) {
                $issues->error('V18', $where, 'the flag '.$flag->code->value.' is listed twice');
            }

            $seen[$flag->code->value] = true;
        }
    }
}
