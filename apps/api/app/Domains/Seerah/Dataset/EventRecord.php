<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Dataset;

use App\Domains\Seerah\Enums\EventKind;
use App\Domains\Seerah\Enums\Origin;

/**
 * One event: the book's heading as its title, its span, place and year. `place` and `year` are null only in a skeleton the author
 * has not filled in (V9 then fails). `order_exception` holds the note of an event the book tells out of time order (V12).
 *
 * @param  list<Flag>  $flags
 */
final readonly class EventRecord
{
    public function __construct(
        public string $id,
        public string $batch,
        public string $section,
        public string $titleAr,
        public ?Span $span,
        public EventKind $kind,
        public ?PlaceRef $place,
        public ?YearRef $year,
        public ?string $route,
        public ?string $orderException,
        public Origin $origin,
        public array $flags,
        public ?string $note,
    ) {}
}
