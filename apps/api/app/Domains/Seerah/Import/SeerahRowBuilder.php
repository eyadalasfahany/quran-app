<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Import;

use App\Domains\Seerah\Canonical\CanonicalBuild;
use App\Domains\Seerah\Canonical\CanonicalSection;
use App\Domains\Seerah\Dataset\EventRecord;
use App\Domains\Seerah\Dataset\Flag;
use App\Domains\Seerah\Dataset\Place;
use App\Domains\Seerah\Dataset\Route;
use App\Domains\Seerah\Dataset\Span;
use App\Domains\Seerah\Exceptions\SeerahImportException;
use App\Domains\Seerah\Validation\ValidationRun;

/**
 * Maps a validated Seerah data set and its canonical book to the rows of the seerah_* tables (ADR 0091, Phase 8 step 23). Pure: no
 * database and no clock. Numeric ids are assigned here: sections and paragraphs from their source codes (s003, p00123), places and
 * routes in file order, events in book order. Every import replaces the rows, so the ids need only be stable within one import.
 */
final class SeerahRowBuilder
{
    public function build(ValidationRun $run, CanonicalBuild $build): SeerahImportRows
    {
        $places = $this->placesOf($run);
        $placeIds = $this->numbered(array_map(static fn (Place $place): string => $place->id, $places));
        $routeIds = $this->numbered(array_map(static fn (Route $route): string => $route->id, $run->data->routes));
        $events = $this->eventsInBookOrder($run);
        $eventIds = $this->numbered(array_map(static fn (EventRecord $event): string => $event->id, $events));

        $layouts = $this->layoutRows($run, $placeIds, $routeIds);
        $eventRows = $this->eventRows($run, $events, $placeIds, $routeIds);

        return new SeerahImportRows([
            'seerah_books' => [$this->bookRow($run, $build)],
            'seerah_sections' => $this->sectionRows($run->index->sections()),
            'seerah_paragraphs' => $this->paragraphRows($build),
            'seerah_places' => $this->placeRows($places, $placeIds),
            'seerah_map_levels' => $layouts['levels'],
            'seerah_map_positions' => $layouts['positions'],
            'seerah_routes' => $this->routeRows($run->data->routes, $routeIds),
            'seerah_route_stops' => $this->routeStopRows($run->data->routes, $routeIds, $placeIds),
            'seerah_map_route_paths' => $layouts['routePaths'],
            'seerah_events' => $eventRows['events'],
            'seerah_event_evidence' => $eventRows['evidence'],
            'seerah_milestones' => $this->milestoneRows($run, $eventIds),
        ]);
    }

    /**
     * @return list<Place>
     */
    private function placesOf(ValidationRun $run): array
    {
        $gazetteer = $run->data->gazetteer;

        return $gazetteer === null ? [] : $gazetteer->places;
    }

    /**
     * @param  list<CanonicalSection>  $sections
     * @return list<array<string, int|float|string|null>>
     */
    private function sectionRows(array $sections): array
    {
        $rows = [];

        foreach ($sections as $position => $section) {
            $rows[] = [
                'id' => $this->number($section->id),
                'code' => $section->id,
                'level' => $section->level->value,
                'title_ar' => $section->title,
                'page' => $section->page,
                'position' => $position + 1,
                'paragraph_from' => $section->paragraphFrom === null ? null : $this->number($section->paragraphFrom),
                'paragraph_to' => $section->paragraphTo === null ? null : $this->number($section->paragraphTo),
            ];
        }

        return $rows;
    }

    /**
     * @return list<array<string, int|float|string|null>>
     */
    private function paragraphRows(CanonicalBuild $build): array
    {
        $rows = [];

        foreach ($build->book->paragraphs as $position => $paragraph) {
            $rows[] = [
                'id' => $this->number($paragraph->id),
                'code' => $paragraph->id,
                'section_id' => $this->number($paragraph->sectionId),
                'position' => $position + 1,
                'page' => $paragraph->page,
                'text_ar' => $paragraph->text,
                'text_sha256' => hash('sha256', $paragraph->text),
            ];
        }

        return $rows;
    }

    /**
     * @param  list<Place>  $places
     * @param  array<string, int>  $placeIds
     * @return list<array<string, int|float|string|null>>
     */
    private function placeRows(array $places, array $placeIds): array
    {
        $rows = [];

        foreach ($places as $place) {
            $rows[] = [
                'id' => $this->idOf($placeIds, $place->id),
                'slug' => $place->id,
                'parent_id' => $place->parent === null ? null : $this->idOf($placeIds, $place->parent),
                'kind' => $place->kind->value,
                'name_ar' => $place->nameAr,
                'lat' => $place->geo?->lat,
                'lng' => $place->geo?->lng,
                'geo_precision' => $place->geo?->precision->value,
                'geo_source' => $place->geo?->source,
                'flags' => $this->flags($place->flags),
            ];
        }

        return $rows;
    }

    /**
     * @param  array<string, int>  $placeIds
     * @param  array<string, int>  $routeIds
     * @return array{levels: list<array<string, int|float|string|null>>, positions: list<array<string, int|float|string|null>>, routePaths: list<array<string, int|float|string|null>>}
     */
    private function layoutRows(ValidationRun $run, array $placeIds, array $routeIds): array
    {
        $levels = [];
        $positions = [];
        $routePaths = [];

        foreach ($run->data->layouts as $layout) {
            $levels[] = [
                'level' => $layout->level,
                'parent_place_id' => $this->idOf($placeIds, $layout->parentPlace),
                'viewbox' => implode(' ', $layout->viewbox),
                'art' => $layout->art,
            ];

            foreach ($layout->positions as $position) {
                $positions[] = [
                    'level' => $layout->level,
                    'place_id' => $this->idOf($placeIds, $position->place),
                    'x' => $position->x,
                    'y' => $position->y,
                    'label_priority' => $position->labelPriority,
                    'label_side' => $position->labelSide,
                    'art_landmark' => $position->artLandmark ? 1 : 0,
                ];
            }

            foreach ($layout->routePaths as $path) {
                $routePaths[] = [
                    'level' => $layout->level,
                    'route_id' => $this->idOf($routeIds, $path->route),
                    'from_place_id' => $this->idOf($placeIds, $path->segment[0]),
                    'to_place_id' => $this->idOf($placeIds, $path->segment[1]),
                    'path_d' => $path->d,
                ];
            }
        }

        return ['levels' => $levels, 'positions' => $positions, 'routePaths' => $routePaths];
    }

    /**
     * @param  list<Route>  $routes
     * @param  array<string, int>  $routeIds
     * @return list<array<string, int|float|string|null>>
     */
    private function routeRows(array $routes, array $routeIds): array
    {
        $rows = [];

        foreach ($routes as $route) {
            $rows[] = [
                'id' => $this->idOf($routeIds, $route->id),
                'slug' => $route->id,
                'kind' => $route->kind->value,
                'name_ar' => $route->nameAr,
            ];
        }

        return $rows;
    }

    /**
     * @param  list<Route>  $routes
     * @param  array<string, int>  $routeIds
     * @param  array<string, int>  $placeIds
     * @return list<array<string, int|float|string|null>>
     */
    private function routeStopRows(array $routes, array $routeIds, array $placeIds): array
    {
        $rows = [];

        foreach ($routes as $route) {
            foreach ($route->stops as $position => $stop) {
                $rows[] = [
                    'route_id' => $this->idOf($routeIds, $route->id),
                    'position' => $position + 1,
                    'place_id' => $this->idOf($placeIds, $stop),
                ];
            }
        }

        return $rows;
    }

    /**
     * @param  list<EventRecord>  $events  in book order
     * @param  array<string, int>  $placeIds
     * @param  array<string, int>  $routeIds
     * @return array{events: list<array<string, int|float|string|null>>, evidence: list<array<string, int|float|string|null>>}
     */
    private function eventRows(ValidationRun $run, array $events, array $placeIds, array $routeIds): array
    {
        $rows = [];
        $evidence = [];

        foreach ($events as $position => $event) {
            $id = $position + 1;
            $section = $run->index->section($event->section);
            [$paragraphFrom, $paragraphTo] = $this->spanOf($event->span, $section);
            $place = $event->place;
            $placeEvidence = $place === null ? [] : $place->evidence;
            $alsoSlugs = $place === null ? [] : $place->also;
            $year = $event->year;
            $yearEvidence = $year === null ? [] : $year->evidence;

            $rows[] = [
                'id' => $id,
                'slug' => $event->id,
                'position' => $id,
                'section_id' => $this->number($event->section),
                'paragraph_from' => $paragraphFrom,
                'paragraph_to' => $paragraphTo,
                'title_ar' => $event->titleAr,
                'kind' => $event->kind->value,
                'place_id' => $place === null ? null : $this->idOf($placeIds, $place->id),
                'place_basis' => $place?->basis->value,
                'also' => $this->encode(array_map(fn (string $slug): int => $this->idOf($placeIds, $slug), $alsoSlugs)),
                'age_from' => $year?->ageFrom,
                'age_to' => $year?->ageTo,
                'era' => $year?->era?->value,
                'hijri_from' => $year?->hijriFrom,
                'hijri_to' => $year?->hijriTo,
                'year_basis' => $year?->basis->value,
                'certainty' => $year?->certainty->value,
                'route_id' => $event->route === null ? null : $this->idOf($routeIds, $event->route),
                'flags' => $this->flags($event->flags),
            ];

            foreach ($placeEvidence as $position => $item) {
                $evidence[] = $this->evidenceRow($id, 'place', $position, $item->para, $item->quote);
            }

            foreach ($yearEvidence as $position => $item) {
                $evidence[] = $this->evidenceRow($id, 'year', $position, $item->para, $item->quote);
            }
        }

        return ['events' => $rows, 'evidence' => $evidence];
    }

    /**
     * @param  array<string, int>  $eventIds
     * @return list<array<string, int|float|string|null>>
     */
    private function milestoneRows(ValidationRun $run, array $eventIds): array
    {
        $rows = [];

        foreach ($run->data->milestones as $position => $milestone) {
            $rows[] = [
                'milestone_key' => $milestone->key,
                'label_ar' => $milestone->labelAr,
                'event_id' => $this->idOf($eventIds, $milestone->event),
                'position' => $position + 1,
            ];
        }

        return $rows;
    }

    /**
     * @return array<string, int|float|string|null>
     */
    private function bookRow(ValidationRun $run, CanonicalBuild $build): array
    {
        return [
            'id' => 1,
            'slug' => $this->configString('seerah.book.slug'),
            'title_ar' => $this->configString('seerah.book.title_ar'),
            'author_ar' => $this->configString('seerah.book.author_ar'),
            'edition_ar' => $this->configString('seerah.book.edition_ar'),
            'attribution_ar' => $this->configString('seerah.book.attribution_ar'),
            'attribution_en' => $this->configString('seerah.book.attribution_en'),
            'source_version' => $this->configString('seerah.source.version'),
            'source_sha256' => $build->sourceSha256,
            'canonical_sha256' => $build->canonicalSha256,
            'sections_count' => count($run->index->sections()),
            'paragraphs_count' => count($build->book->paragraphs),
            'places_count' => count($this->placesOf($run)),
            'events_count' => count($run->data->allEvents()),
            'routes_count' => count($run->data->routes),
        ];
    }

    /**
     * Events in book order: by the position of their section, then by file order inside a section.
     *
     * @return list<EventRecord>
     */
    private function eventsInBookOrder(ValidationRun $run): array
    {
        $keyed = [];

        foreach ($run->data->allEvents() as $sequence => $event) {
            $keyed[] = [$run->index->sectionPosition($event->section) ?? PHP_INT_MAX, $sequence, $event];
        }

        usort($keyed, static fn (array $first, array $second): int => [$first[0], $first[1]] <=> [$second[0], $second[1]]);

        return array_map(static fn (array $item): EventRecord => $item[2], $keyed);
    }

    /**
     * @return array{int|null, int|null}
     */
    private function spanOf(?Span $span, ?CanonicalSection $section): array
    {
        if ($span !== null) {
            return [$this->number($span->from), $this->number($span->to)];
        }

        if ($section === null || $section->paragraphFrom === null || $section->paragraphTo === null) {
            return [null, null];
        }

        return [$this->number($section->paragraphFrom), $this->number($section->paragraphTo)];
    }

    /**
     * @return array<string, int|float|string|null>
     */
    private function evidenceRow(int $eventId, string $kind, int $index, string $paragraph, string $quote): array
    {
        return [
            'event_id' => $eventId,
            'kind' => $kind,
            'position' => $index + 1,
            'paragraph_id' => $this->number($paragraph),
            'quote_ar' => $quote,
        ];
    }

    /**
     * @param  list<Flag>  $flags
     */
    private function flags(array $flags): string
    {
        return $this->encode(array_map(
            static fn (Flag $flag): array => ['code' => $flag->code->value, 'note' => $flag->note],
            $flags,
        ));
    }

    /**
     * @param  list<string>  $ids
     * @return array<string, int>
     */
    private function numbered(array $ids): array
    {
        $numbers = [];

        foreach ($ids as $position => $id) {
            $numbers[$id] = $position + 1;
        }

        return $numbers;
    }

    /**
     * @param  array<string, int>  $ids
     */
    private function idOf(array $ids, string $slug): int
    {
        if (! isset($ids[$slug])) {
            throw new SeerahImportException('A record refers to a missing id.');
        }

        return $ids[$slug];
    }

    /**
     * The number of a source code: s003 is 3, p00123 is 123. The validator has checked the pattern.
     */
    private function number(string $code): int
    {
        return (int) substr($code, 1);
    }

    /**
     * @param  array<array-key, mixed>  $value
     */
    private function encode(array $value): string
    {
        return json_encode(array_values($value), JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    private function configString(string $key): string
    {
        return (string) config($key, '');
    }
}
