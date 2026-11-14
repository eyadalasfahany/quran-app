<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Dataset;

/**
 * One review batch of events (events/E1.json to E4.json).
 *
 * @param  list<EventRecord>  $events
 */
final readonly class EventsFile
{
    public function __construct(
        public string $batch,
        public string $period,
        public array $events,
    ) {}
}
