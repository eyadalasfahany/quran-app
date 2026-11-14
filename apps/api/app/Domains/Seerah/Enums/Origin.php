<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Enums;

/**
 * Who wrote a record. Informational only: both values need a sign-off (data-format.md, V18).
 */
enum Origin: string
{
    case DraftedByAgent = 'drafted_by_agent';
    case CuratedByDeveloper = 'curated_by_developer';
}
