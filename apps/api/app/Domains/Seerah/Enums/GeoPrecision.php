<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Enums;

/**
 * How exact a coordinate is (gazetteer.json, `geo.precision`).
 */
enum GeoPrecision: string
{
    case Exact = 'exact';
    case Site = 'site';
    case City = 'city';
    case Area = 'area';
}
