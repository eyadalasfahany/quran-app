<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Enums;

/**
 * The level of a place in the gazetteer tree: region > city > landmark (data-format.md, V4).
 */
enum PlaceKind: string
{
    case Region = 'region';
    case City = 'city';
    case Landmark = 'landmark';
}
