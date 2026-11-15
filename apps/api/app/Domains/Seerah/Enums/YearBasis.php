<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Enums;

/**
 * How an event's year is given (data-format.md, `year.basis`). `unspecified` is the «غير محدد» bucket and has no age.
 */
enum YearBasis: string
{
    case StatedAge = 'stated_age';
    case StatedHijri = 'stated_hijri';
    case StatedRelative = 'stated_relative';
    case SectionYear = 'section_year';
    case Implied = 'implied';
    case Unstated = 'unstated';
    case Unspecified = 'unspecified';
}
