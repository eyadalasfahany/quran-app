<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Dataset;

use App\Domains\Seerah\Canonical\CanonicalSection;

/**
 * Everything in the data folder, parsed. A file that is missing or fails to parse is null or absent here, and its problem is in
 * the issue list of the loader. Immutable.
 *
 * @param  array<string, EventsFile>  $events  batch => file
 * @param  array<string, DrawnLayout>  $layouts  level => layout
 * @param  array<string, SignOff>  $signOffs  group => sign-off
 * @param  list<CanonicalSection>|null  $structure  the sections of book/structure.json, in book order
 */
final readonly class SeerahDataset
{
    /**
     * @param  array<string, EventsFile>  $events
     * @param  array<string, DrawnLayout>  $layouts
     * @param  array<string, SignOff>  $signOffs
     * @param  list<CanonicalSection>|null  $structure
     * @param  list<Route>  $routes
     * @param  list<Milestone>  $milestones
     * @param  list<Exclusion>  $exclusions
     */
    public function __construct(
        public ?string $structureSourceSha256,
        public ?string $structureCanonicalSha256,
        public ?array $structure,
        public ?Gazetteer $gazetteer,
        public array $events,
        public array $routes,
        public array $milestones,
        public array $exclusions,
        public array $layouts,
        public array $signOffs,
    ) {}

    /**
     * @return list<EventRecord>
     */
    public function allEvents(): array
    {
        $all = [];

        foreach ($this->events as $file) {
            array_push($all, ...$file->events);
        }

        return $all;
    }
}
