<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Authoring;

use App\Domains\Seerah\Canonical\CanonicalBook;
use App\Domains\Seerah\Dataset\BookIndex;
use App\Domains\Seerah\Dataset\EventRecord;
use App\Domains\Seerah\Dataset\RecordSerializer;
use App\Domains\Seerah\Dataset\Span;
use App\Domains\Seerah\Enums\EventKind;
use App\Domains\Seerah\Enums\Origin;
use App\Domains\Seerah\Exceptions\SeerahAuthoringException;
use App\Domains\Seerah\Format\SeerahJson;

/**
 * Writes the event skeleton of one batch (`seerah:skeleton`): one draft event per section, its title copied from the heading, its span
 * from the structure, and no place or year (the author assigns those from quotes). The event id is `e` and the section's number.
 */
final class SkeletonWriter
{
    /**
     * @return array{count: int, json: string}
     *
     * @throws SeerahAuthoringException when the batch is unknown
     */
    public function build(string $batch, string $period, int $fromPosition, int $toPosition, BookIndex $index, CanonicalBook $book): array
    {
        $paragraphs = [];

        foreach ($book->paragraphs as $paragraph) {
            $paragraphs[$paragraph->sectionId][] = $paragraph->id;
        }

        $events = [];

        foreach (array_slice($index->sections(), $fromPosition, $toPosition - $fromPosition + 1) as $section) {
            $ids = $paragraphs[$section->id] ?? [];
            $events[] = RecordSerializer::event(new EventRecord(
                id: 'e'.substr($section->id, 1),
                batch: $batch,
                section: $section->id,
                titleAr: $section->title,
                span: $ids === [] ? null : new Span($ids[0], $ids[count($ids) - 1]),
                kind: EventKind::Event,
                place: null,
                year: null,
                route: null,
                orderException: null,
                origin: Origin::DraftedByAgent,
                flags: [],
                note: null,
            ));
        }

        $file = ['format' => 1, 'batch' => $batch, 'period' => $period, 'events' => $events];

        return ['count' => count($events), 'json' => SeerahJson::render($file)];
    }
}
