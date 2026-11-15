<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Validation\Rules;

use App\Domains\Seerah\Validation\IssueBag;
use App\Domains\Seerah\Validation\ValidationContext;

/**
 * V8: every event's section exists, its title is the heading exactly (byte for byte), and its span lies inside the section. A section
 * with no paragraph has an event with no span.
 */
final class V8Sections implements ValidationRule
{
    public function check(ValidationContext $context, IssueBag $issues): void
    {
        foreach ($context->data->allEvents() as $event) {
            $where = $event->batch.' '.$event->id;
            $section = $context->index->section($event->section);

            if ($section === null) {
                $issues->error('V8', $where, 'section does not exist: '.$event->section);

                continue;
            }

            if ($event->titleAr !== $section->title) {
                $issues->error('V8', $where, 'title is not the heading of '.$event->section);
            }

            if ($context->index->paragraphsOf($event->section) === [] && $event->span !== null) {
                $issues->error('V8', $where, 'the section has no paragraph, so the span must be null');

                continue;
            }

            if ($event->span !== null && $context->index->coveredIndices($event->section, $event->span) === null) {
                $issues->error('V8', $where, 'span is not a paragraph range inside '.$event->section);
            }
        }
    }
}
