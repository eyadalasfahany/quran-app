<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Dataset;

/**
 * Turns a parsed record back into the array it was read from, in the file's key order. A record's hash is the SHA-256 of this
 * array's compact JSON, so approval is bound to the text that is in the file (ADR 0089 §1).
 */
final class RecordSerializer
{
    /**
     * @return array<string, mixed>
     */
    public static function event(EventRecord $event): array
    {
        return [
            'id' => $event->id,
            'section' => $event->section,
            'title_ar' => $event->titleAr,
            'span' => $event->span === null ? null : ['from' => $event->span->from, 'to' => $event->span->to],
            'kind' => $event->kind->value,
            'place' => $event->place === null ? null : self::placeRef($event->place),
            'year' => $event->year === null ? null : self::year($event->year),
            'route' => $event->route,
            'order_exception' => $event->orderException === null ? null : ['note' => $event->orderException],
            'origin' => $event->origin->value,
            'flags' => self::flags($event->flags),
            'note' => $event->note,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function place(Place $place): array
    {
        return [
            'id' => $place->id,
            'parent' => $place->parent,
            'kind' => $place->kind->value,
            'name_ar' => $place->nameAr,
            'names_in_book' => $place->namesInBook,
            'name_en' => $place->nameEn,
            'geo' => $place->geo === null ? null : [
                'lat' => $place->geo->lat,
                'lng' => $place->geo->lng,
                'precision' => $place->geo->precision->value,
                'source' => $place->geo->source,
                'box' => $place->geo->box,
                'note' => $place->geo->note,
            ],
            'evidence' => self::evidence($place->evidence),
            'origin' => $place->origin->value,
            'flags' => self::flags($place->flags),
            'note' => $place->note,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function route(Route $route): array
    {
        return [
            'id' => $route->id,
            'name_ar' => $route->nameAr,
            'stops' => $route->stops,
            'events' => $route->events,
            'evidence' => self::evidence($route->evidence),
            'kind' => $route->kind->value,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function milestone(Milestone $milestone): array
    {
        return ['id' => $milestone->key, 'label_ar' => $milestone->labelAr, 'event' => $milestone->event];
    }

    /**
     * @return array<string, mixed>
     */
    public static function exclusion(Exclusion $exclusion): array
    {
        return ['section' => $exclusion->section, 'reason' => $exclusion->reason->value, 'note' => $exclusion->note];
    }

    /**
     * @return array<string, mixed>
     */
    private static function placeRef(PlaceRef $place): array
    {
        return [
            'id' => $place->id,
            'basis' => $place->basis->value,
            'evidence' => self::evidence($place->evidence),
            'also' => $place->also,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function year(YearRef $year): array
    {
        return [
            'basis' => $year->basis->value,
            'age_from' => $year->ageFrom,
            'age_to' => $year->ageTo,
            'era' => $year->era?->value,
            'hijri_from' => $year->hijriFrom,
            'hijri_to' => $year->hijriTo,
            'certainty' => $year->certainty->value,
            'evidence' => self::evidence($year->evidence),
        ];
    }

    /**
     * @param  list<Evidence>  $evidence
     * @return list<array{para: string, quote: string}>
     */
    private static function evidence(array $evidence): array
    {
        return array_map(static fn (Evidence $item): array => ['para' => $item->para, 'quote' => $item->quote], $evidence);
    }

    /**
     * @param  list<Flag>  $flags
     * @return list<array{code: string, note: ?string}>
     */
    private static function flags(array $flags): array
    {
        return array_map(static fn (Flag $flag): array => ['code' => $flag->code->value, 'note' => $flag->note], $flags);
    }
}
