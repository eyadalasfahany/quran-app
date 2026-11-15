<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Enums;

/**
 * How firm a year is (data-format.md, `year.certainty`).
 */
enum Certainty: string
{
    case Stated = 'stated';
    case Approximate = 'approximate';
    case DeveloperAssigned = 'developer_assigned';
    case Unspecified = 'unspecified';
}
