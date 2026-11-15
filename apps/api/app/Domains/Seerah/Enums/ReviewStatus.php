<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Enums;

/**
 * The review state of one record, derived from the sign-off files and the record's hash (data-format.md, V17). Never typed.
 */
enum ReviewStatus: string
{
    case Approved = 'approved';
    case Stale = 'stale';
    case Draft = 'draft';
}
