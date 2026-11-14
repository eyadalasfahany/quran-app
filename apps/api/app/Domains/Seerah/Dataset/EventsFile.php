<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Dataset;

/**
 * One review batch of events (events/E1.json to E4.json).
 */
final readonly class EventsFile
{
    /**
     * @param  list<EventRecord>  $events
     */
    public function __construct(
        public string $batch,
        public string $period,
        public array $events,
    ) {}
}
