<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Validation\Rules;

use App\Domains\Seerah\Dataset\EventRecord;
use App\Domains\Seerah\Dataset\Evidence;
use App\Domains\Seerah\Dataset\PlaceTree;
use App\Domains\Seerah\Enums\Certainty;
use App\Domains\Seerah\Enums\FlagCode;
use App\Domains\Seerah\Enums\PlaceBasis;
use App\Domains\Seerah\Enums\YearBasis;
use App\Domains\Seerah\Validation\IssueBag;
use App\Domains\Seerah\Validation\ValidationContext;

/**
 * V9 and V10 (flags): every event has a place and a year. A place stated by the book has a quote inside the event's span naming it
 * or a place under it (else the flag evidence_outside_span). `other` and the year bucket are allowed only with their flags. Implied
 * and developer-assigned values carry their flags.
 */
final class V9Evidence implements ValidationRule
{
    public function check(ValidationContext $context, IssueBag $issues): void
    {
        $gazetteer = $context->data->gazetteer;
        $tree = new PlaceTree($gazetteer->places ?? []);

        foreach ($context->data->allEvents() as $event) {
            $where = $event->batch.' '.$event->id;

            if ($event->place === null) {
                $issues->error('V9', $where, 'the event has no place');
            }

            if ($event->year === null) {
                $issues->error('V9', $where, 'the event has no year');
            }

            if ($event->place !== null) {
                $this->place($event, $context, $tree, $issues);
            }

            if ($event->year !== null) {
                $this->year($event, $context, $issues);
            }
        }
    }

    private function place(EventRecord $event, ValidationContext $context, PlaceTree $tree, IssueBag $issues): void
    {
        $ref = $event->place;
        $where = $event->batch.' '.$event->id.' place';

        if ($ref === null) {
            return;
        }

        if ($ref->id === 'other') {
            if ($ref->basis !== PlaceBasis::Unstated || $ref->evidence !== [] || ! $this->hasFlag($event->flags, FlagCode::PlaceNotStated)) {
                $issues->error('V9', $where, 'the place other needs basis unstated, no quote and the flag place_not_stated');
            }

            return;
        }

        if (! $tree->has($ref->id)) {
            return;
        }

        if ($ref->basis === PlaceBasis::Unstated) {
            $issues->error('V9', $where, 'an unstated place is allowed only as the place other');

            return;
        }

        if ($ref->basis === PlaceBasis::Implied) {
            if (! $this->hasFlag($event->flags, FlagCode::PlaceImplied)) {
                $issues->error('V10', $where, 'an implied place needs the flag place_implied');
            }

            return;
        }

        $names = $tree->namesOfSubtree($ref->id);
        $inSpan = $this->inSpan($event, $context);
        $inside = false;

        foreach ($ref->evidence as $evidence) {
            if ($this->names($evidence, $names) && $this->paraInside($evidence, $inSpan, $context)) {
                $inside = true;
            }
        }

        if ($inside) {
            return;
        }

        if ($ref->evidence === []) {
            $issues->error('V9', $where, 'a stated place needs a quote');
        } elseif (! $this->hasFlag($event->flags, FlagCode::EvidenceOutsideSpan)) {
            $issues->error('V9', $where, 'no quote for the place lies inside the span (flag evidence_outside_span or fix the span)');
        }
    }

    private function year(EventRecord $event, ValidationContext $context, IssueBag $issues): void
    {
        $year = $event->year;
        $where = $event->batch.' '.$event->id.' year';

        if ($year === null) {
            return;
        }

        if ($year->basis === YearBasis::Unspecified) {
            if ($year->ageFrom !== null || $year->ageTo !== null || $year->era !== null || $year->hijriFrom !== null || $year->hijriTo !== null || $year->certainty !== Certainty::Unspecified) {
                $issues->error('V9', $where, 'the year bucket has no age, era, Hijri year or certainty');
            }

            if (! $this->hasFlag($event->flags, FlagCode::YearNotStated)) {
                $issues->error('V10', $where, 'the year bucket needs the flag year_not_stated');
            }

            return;
        }

        if ($year->basis === YearBasis::Unstated) {
            $issues->error('V9', $where, 'an unstated year is allowed only as the bucket unspecified');

            return;
        }

        if ($year->ageFrom === null || $year->ageTo === null) {
            $issues->error('V9', $where, 'a dated year needs its ages');
        }

        if ($year->certainty === Certainty::Unspecified) {
            $issues->error('V9', $where, 'a dated year needs a certainty');
        }

        if ($year->certainty === Certainty::DeveloperAssigned && ! $this->hasFlag($event->flags, FlagCode::YearDeveloperAssigned)) {
            $issues->error('V10', $where, 'a developer-assigned year needs the flag year_developer_assigned');
        }

        if ($year->basis === YearBasis::Implied && ! $this->hasFlag($event->flags, FlagCode::YearImplied)) {
            $issues->error('V10', $where, 'an implied year needs the flag year_implied');
        }

        if ($year->basis === YearBasis::SectionYear && $context->index->yearOf($event->section) === null) {
            $issues->error('V9', $where, 'a year inherited from a heading needs a year heading above the section');
        }

        if (in_array($year->basis, [YearBasis::StatedAge, YearBasis::StatedHijri, YearBasis::StatedRelative], true)) {
            $inSpan = $this->inSpan($event, $context);
            $inside = false;

            foreach ($year->evidence as $evidence) {
                if ($this->paraInside($evidence, $inSpan, $context)) {
                    $inside = true;
                }
            }

            if (! $inside && ($year->evidence === [] || ! $this->hasFlag($event->flags, FlagCode::EvidenceOutsideSpan))) {
                $issues->error('V9', $where, 'a stated year needs a quote inside the span (or the flag evidence_outside_span)');
            }
        }
    }

    /**
     * The paragraph ids of the event's span, or of its whole section when the span is null.
     *
     * @return list<string>
     */
    private function inSpan(EventRecord $event, ValidationContext $context): array
    {
        $indices = $context->index->coveredIndices($event->section, $event->span);

        if ($indices === null) {
            return [];
        }

        return array_slice($context->index->paragraphsOf($event->section), $indices[0], $indices[1] - $indices[0] + 1);
    }

    /**
     * @param  list<string>  $inSpan
     */
    private function paraInside(Evidence $evidence, array $inSpan, ValidationContext $context): bool
    {
        return in_array($evidence->para, $inSpan, true) && $context->index->hasParagraph($evidence->para);
    }

    /**
     * @param  list<string>  $names
     */
    private function names(Evidence $evidence, array $names): bool
    {
        foreach ($names as $name) {
            if ($name !== '' && str_contains($evidence->quote, $name)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  list<\App\Domains\Seerah\Dataset\Flag>  $flags
     */
    private function hasFlag(array $flags, FlagCode $code): bool
    {
        foreach ($flags as $flag) {
            if ($flag->code === $code) {
                return true;
            }
        }

        return false;
    }
}
