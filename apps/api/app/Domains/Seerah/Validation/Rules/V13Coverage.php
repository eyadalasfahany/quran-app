<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Validation\Rules;

use App\Domains\Seerah\Dataset\EventRecord;
use App\Domains\Seerah\Validation\IssueBag;
use App\Domains\Seerah\Validation\ValidationContext;

/**
 * V13: the batches (config) are contiguous, start at their heading and reach the last section; an event sits in the batch that holds
 * its section. Each section is covered by events whose spans partition it, or excluded, never both and never twice. A section with
 * nothing, or with paragraphs no event covers, is an error with --complete and a warning otherwise.
 */
final class V13Coverage implements ValidationRule
{
    public function check(ValidationContext $context, IssueBag $issues): void
    {
        $ranges = $this->batchRanges($context, $issues);

        $eventsBySection = [];

        foreach ($context->data->allEvents() as $event) {
            $eventsBySection[$event->section][] = $event;
            $position = $context->index->sectionPosition($event->section);
            $range = $ranges[$event->batch] ?? null;

            if ($range !== null && $position !== null && ($position < $range[0] || $position > $range[1])) {
                $issues->error('V13', $event->batch.' '.$event->id, 'the section is outside the batch of this file');
            }
        }

        $excluded = [];

        foreach ($context->data->exclusions as $exclusion) {
            $where = 'exclusions '.$exclusion->section;

            if (! $context->index->hasSection($exclusion->section)) {
                $issues->error('V13', $where, 'section does not exist');
            }

            if ($exclusion->reason->value === 'other' && ($exclusion->note === null || $exclusion->note === '')) {
                $issues->error('V13', $where, 'an exclusion for other needs a note');
            }

            $excluded[$exclusion->section] = true;
        }

        $uncovered = [];
        $gaps = [];

        foreach ($context->index->sections() as $section) {
            $events = $eventsBySection[$section->id] ?? [];
            $isExcluded = isset($excluded[$section->id]);

            if ($events !== [] && $isExcluded) {
                $issues->error('V13', $section->id, 'the section is both covered by an event and excluded');
            }

            if ($events === []) {
                if (! $isExcluded) {
                    $uncovered[] = $section->id;
                }

                continue;
            }

            if ($this->partition($section->id, $events, $context, $issues)) {
                $gaps[] = $section->id;
            }
        }

        $this->report($uncovered, 'sections have no event and no exclusion', $context, $issues);
        $this->report($gaps, 'sections have paragraphs that no event covers', $context, $issues);

        $total = count($context->index->sections());
        $issues->info('V13', 'coverage', ($total - count($uncovered)).' of '.$total.' sections covered or excluded');
    }

    /**
     * The book positions of each batch, checked for contiguity, the start title and the reach to the last section.
     *
     * @return array<string, array{int, int}>
     */
    private function batchRanges(ValidationContext $context, IssueBag $issues): array
    {
        $ranges = [];
        $previousTo = null;
        $lastPosition = count($context->index->sections()) - 1;

        foreach ($context->batches as $name => $batch) {
            $from = $context->index->sectionPosition($batch['from']);
            $to = $context->index->sectionPosition($batch['to']);

            if ($from === null || $to === null || $from > $to) {
                $issues->error('V13', 'config batches '.$name, 'the batch ids do not name a section range in book order');

                continue;
            }

            if ($previousTo !== null && $from !== $previousTo + 1) {
                $issues->error('V13', 'config batches '.$name, 'the batch does not start right after the one before it');
            }

            if ($context->index->section($batch['from'])?->title !== $batch['start_title']) {
                $issues->error('V13', 'config batches '.$name, 'start_title is not the heading of '.$batch['from']);
            }

            $ranges[$name] = [$from, $to];
            $previousTo = $to;
        }

        if ($previousTo !== $lastPosition) {
            $issues->error('V13', 'config batches', 'the batches do not reach the last section of the book');
        }

        return $ranges;
    }

    /**
     * Whether the events of one section leave any of its paragraphs uncovered. Overlaps are errors at once.
     *
     * @param  list<EventRecord>  $events
     */
    private function partition(string $sectionId, array $events, ValidationContext $context, IssueBag $issues): bool
    {
        $ids = $context->index->paragraphsOf($sectionId);

        if ($ids === []) {
            if (count($events) > 1) {
                $issues->error('V13', $sectionId, 'a section with no paragraph holds one event at most');
            }

            return false;
        }

        if (count($events) === 1 && $events[0]->span === null) {
            return false;
        }

        $spans = [];

        foreach ($events as $event) {
            $indices = $context->index->coveredIndices($sectionId, $event->span);

            if ($indices === null) {
                $issues->error('V13', $event->batch.' '.$event->id, 'span is not inside its section');

                continue;
            }

            $spans[] = [$indices[0], $indices[1], $event->id];
        }

        usort($spans, static fn (array $a, array $b): int => $a[0] <=> $b[0]);

        $next = 0;
        $gap = false;

        foreach ($spans as [$from, $to, $id]) {
            if ($from < $next) {
                $issues->error('V13', $sectionId.' '.$id, 'the span overlaps another event of the section (covered twice)');
            } elseif ($from > $next) {
                $gap = true;
            }

            $next = max($next, $to + 1);
        }

        return $gap || $next < count($ids);
    }

    /**
     * @param  list<string>  $sections
     */
    private function report(array $sections, string $message, ValidationContext $context, IssueBag $issues): void
    {
        if ($sections === []) {
            return;
        }

        if ($context->complete) {
            foreach ($sections as $section) {
                $issues->error('V13', $section, $message);
            }

            return;
        }

        $list = implode(', ', array_slice($sections, 0, 5)).(count($sections) > 5 ? ', …' : '');
        $issues->warning('V13', 'coverage', count($sections).' '.$message.' (first: '.$list.'); errors with --complete');
    }
}
