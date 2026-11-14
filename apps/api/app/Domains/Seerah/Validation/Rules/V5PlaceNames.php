<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Validation\Rules;

use App\Domains\Seerah\Enums\FlagCode;
use App\Domains\Seerah\Validation\IssueBag;
use App\Domains\Seerah\Validation\ValidationContext;

/**
 * V5: every place has a quote containing its name or one of its names in the book. The place `other` and a region flagged as not
 * in the book directly are exempt.
 */
final class V5PlaceNames implements ValidationRule
{
    public function check(ValidationContext $context, IssueBag $issues): void
    {
        foreach ($context->data->gazetteer?->places ?? [] as $place) {
            if ($place->id === 'other' || $this->flagged($place->flags, FlagCode::NotInBookDirectly)) {
                continue;
            }

            $names = array_values(array_unique([$place->nameAr, ...$place->namesInBook]));
            $found = false;

            foreach ($place->evidence as $evidence) {
                foreach ($names as $name) {
                    if ($name !== '' && str_contains($evidence->quote, $name)) {
                        $found = true;
                    }
                }
            }

            if (! $found) {
                $issues->error('V5', 'gazetteer '.$place->id, 'no quote contains the name of the place or a name it has in the book');
            }
        }
    }

    /**
     * @param  list<\App\Domains\Seerah\Dataset\Flag>  $flags
     */
    private function flagged(array $flags, FlagCode $code): bool
    {
        foreach ($flags as $flag) {
            if ($flag->code === $code) {
                return true;
            }
        }

        return false;
    }
}
