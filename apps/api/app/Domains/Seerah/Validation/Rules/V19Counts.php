<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Validation\Rules;

use App\Domains\Seerah\Validation\IssueBag;
use App\Domains\Seerah\Validation\ValidationContext;

/**
 * V19: the counts of sections, paragraphs, places, exclusions, routes, milestones and events per batch are printed, and checked
 * against the pins in config (seerah.counts). A count that changes without a developer edit of the pin fails.
 */
final class V19Counts implements ValidationRule
{
    public function check(ValidationContext $context, IssueBag $issues): void
    {
        $events = [];

        foreach (array_keys($context->batches) as $batch) {
            $events[$batch] = count($context->data->events[$batch]->events ?? []);
        }

        $actual = [
            'sections' => count($context->index->sections()),
            'paragraphs' => count($context->book->paragraphs),
            'places' => count($context->data->gazetteer?->places ?? []),
            'exclusions' => count($context->data->exclusions),
            'routes' => count($context->data->routes),
            'milestones' => count($context->data->milestones),
            'events' => $events,
        ];

        $issues->info('V19', 'counts', 'sections '.$actual['sections'].', paragraphs '.$actual['paragraphs'].', places '.$actual['places'].', exclusions '.$actual['exclusions'].', routes '.$actual['routes'].', milestones '.$actual['milestones'].', events '.implode(' / ', array_map(
            static fn (string $batch, int $count): string => $batch.' '.$count,
            array_keys($events),
            array_values($events),
        )));

        if ($context->counts === null) {
            return;
        }

        foreach (['sections', 'paragraphs', 'places', 'exclusions', 'routes', 'milestones'] as $key) {
            if ($context->counts[$key] !== $actual[$key]) {
                $issues->error('V19', 'counts '.$key, $actual[$key].' differs from the pin '.$context->counts[$key].' in config');
            }
        }

        foreach ($events as $batch => $count) {
            if (($context->counts['events'][$batch] ?? null) !== $count) {
                $issues->error('V19', 'counts events '.$batch, $count.' differs from the pin in config');
            }
        }
    }
}
