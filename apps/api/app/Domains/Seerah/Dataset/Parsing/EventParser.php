<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Dataset\Parsing;

use App\Domains\Seerah\Dataset\EventRecord;
use App\Domains\Seerah\Dataset\EventsFile;
use App\Domains\Seerah\Dataset\PlaceRef;
use App\Domains\Seerah\Dataset\Span;
use App\Domains\Seerah\Dataset\YearRef;
use App\Domains\Seerah\Enums\Certainty;
use App\Domains\Seerah\Enums\Era;
use App\Domains\Seerah\Enums\EventKind;
use App\Domains\Seerah\Enums\Origin;
use App\Domains\Seerah\Enums\PlaceBasis;
use App\Domains\Seerah\Enums\YearBasis;
use App\Domains\Seerah\Validation\IssueBag;

/**
 * Parses events/E1.json to E4.json (data-format.md, `events/<batch>.json`).
 */
final class EventParser
{
    private const array FILE_KEYS = ['format', 'batch', 'period', 'events'];

    private const array EVENT_KEYS = [
        'id', 'section', 'title_ar', 'span', 'kind', 'place', 'year', 'route', 'order_exception', 'origin', 'flags', 'note',
    ];

    private const array PLACE_KEYS = ['id', 'basis', 'evidence', 'also'];

    private const array YEAR_KEYS = [
        'basis', 'age_from', 'age_to', 'era', 'hijri_from', 'hijri_to', 'certainty', 'evidence',
    ];

    /**
     * @param  array<array-key, mixed>  $decoded
     */
    public function parse(array $decoded, string $where, string $batch, IssueBag $issues): EventsFile
    {
        FragmentParser::checkFormat($decoded, $where, $issues);
        $reader = new RecordReader($decoded, $where, 'V2', $issues);
        $reader->expectKeys(self::FILE_KEYS);

        if (($decoded['batch'] ?? null) !== $batch) {
            $issues->error('V2', $where, 'batch must be '.$batch);
        }

        return new EventsFile(
            batch: $batch,
            period: $reader->string('period'),
            events: $reader->objectList('events', fn (array $item, string $at): EventRecord => $this->event($item, $at, $batch, $issues)),
        );
    }

    /**
     * @param  array<array-key, mixed>  $item
     */
    private function event(array $item, string $where, string $batch, IssueBag $issues): EventRecord
    {
        $reader = new RecordReader($item, $where, 'V8', $issues);
        $reader->expectKeys(self::EVENT_KEYS);
        $kind = $reader->enumOf('kind', EventKind::class, EventKind::Event);
        $origin = $reader->enumOf('origin', Origin::class, Origin::DraftedByAgent);

        return new EventRecord(
            id: $reader->string('id'),
            batch: $batch,
            section: $reader->string('section'),
            titleAr: $reader->string('title_ar'),
            span: $this->span($reader),
            kind: $kind,
            place: $this->placeRef($reader),
            year: $this->yearRef($reader),
            route: $reader->nullableString('route'),
            orderException: $this->orderException($reader),
            origin: $origin,
            flags: FragmentParser::flags($reader, 'flags'),
            note: $reader->nullableString('note'),
        );
    }

    private function span(RecordReader $reader): ?Span
    {
        $span = $reader->object('span', static function (array $item, string $where) use ($reader): Span {
            $range = new RecordReader($item, $where, 'V8', $reader->issues());
            $range->expectKeys(['from', 'to']);

            return new Span($range->string('from'), $range->string('to'));
        }, true);

        return $span instanceof Span ? $span : null;
    }

    private function placeRef(RecordReader $reader): ?PlaceRef
    {
        $place = $reader->object('place', static function (array $item, string $where) use ($reader): PlaceRef {
            $ref = new RecordReader($item, $where, 'V9', $reader->issues());
            $ref->expectKeys(self::PLACE_KEYS);
            $basis = $ref->enumOf('basis', PlaceBasis::class, PlaceBasis::Unstated);

            return new PlaceRef(
                id: $ref->string('id'),
                basis: $basis,
                evidence: FragmentParser::evidence($ref, 'evidence'),
                also: $ref->stringList('also'),
            );
        }, true);

        return $place instanceof PlaceRef ? $place : null;
    }

    private function yearRef(RecordReader $reader): ?YearRef
    {
        $year = $reader->object('year', static function (array $item, string $where) use ($reader): YearRef {
            $ref = new RecordReader($item, $where, 'V11', $reader->issues());
            $ref->expectKeys(self::YEAR_KEYS);
            $basis = $ref->enumOf('basis', YearBasis::class, YearBasis::Unspecified);
            $certainty = $ref->enumOf('certainty', Certainty::class, Certainty::Unspecified);
            $era = $ref->enumOrNull('era', Era::class);

            return new YearRef(
                basis: $basis,
                ageFrom: $ref->nullableInt('age_from'),
                ageTo: $ref->nullableInt('age_to'),
                era: $era instanceof Era ? $era : null,
                hijriFrom: $ref->nullableInt('hijri_from'),
                hijriTo: $ref->nullableInt('hijri_to'),
                certainty: $certainty,
                evidence: FragmentParser::evidence($ref, 'evidence'),
            );
        }, true);

        return $year instanceof YearRef ? $year : null;
    }

    private function orderException(RecordReader $reader): ?string
    {
        $exception = $reader->object('order_exception', static function (array $item, string $where) use ($reader): string {
            $note = new RecordReader($item, $where, 'V12', $reader->issues());
            $note->expectKeys(['note']);

            return $note->string('note');
        }, true);

        return is_string($exception) ? $exception : null;
    }
}
