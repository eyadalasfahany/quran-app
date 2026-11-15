<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Enums;

/**
 * Whether an Azkar entry is a dhikr (recited, counted) or a dua (said in one's own words, reviewed by the developer).
 * Set per entry in config azkar_entry_types.php (plan docs/plans/azkar-duas-split.md).
 */
enum AzkarEntryClass: string
{
    case Dhikr = 'dhikr';
    case Dua = 'dua';
}
