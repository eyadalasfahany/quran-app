<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Enums;

/**
 * Every decision the book leaves open. A record that carries one needs the developer's decision in its sign-off (V10, release).
 * Each flag carries a note. The codes are closed: an unknown code is a V18 error.
 */
enum FlagCode: string
{
    case PlaceNotStated = 'place_not_stated';
    case PlaceImplied = 'place_implied';
    case YearNotStated = 'year_not_stated';
    case YearImplied = 'year_implied';
    case YearDeveloperAssigned = 'year_developer_assigned';
    case DisputedDate = 'disputed_date';
    case DisputedLocation = 'disputed_location';
    case ApproximateLocation = 'approximate_location';
    case OrderException = 'order_exception';
    case EvidenceOutsideSpan = 'evidence_outside_span';
    case NotInBookDirectly = 'not_in_book_directly';
}
