<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Enums;

/**
 * The Hijri era of a year: before the Hijra (ق.هـ, `bh`) or after it (هـ, `ah`).
 */
enum Era: string
{
    case BeforeHijra = 'bh';
    case AfterHijra = 'ah';
}
