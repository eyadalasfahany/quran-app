<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Enums;

/**
 * The kind of a journey on the map (routes.json).
 */
enum RouteKind: string
{
    case Trip = 'trip';
    case Hijra = 'hijra';
    case Taif = 'taif';
    case Ghazwa = 'ghazwa';
    case Habasha = 'habasha';
}
