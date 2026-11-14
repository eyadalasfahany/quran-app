<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Enums;

/**
 * How an event's place is stated by the book (data-format.md, `place.basis`). `unstated` is valid only for the place `other`.
 */
enum PlaceBasis: string
{
    case Stated = 'stated';
    case Implied = 'implied';
    case Unstated = 'unstated';
}
