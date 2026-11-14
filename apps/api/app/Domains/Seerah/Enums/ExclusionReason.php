<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Enums;

/**
 * Why a section has no event (exclusions.json). `year_heading` is added by the Shamela edition: its «السنة …» headings have no
 * text of their own and carry the year for the sections below them (V12). `other` needs a note.
 */
enum ExclusionReason: string
{
    case FrontMatter = 'front_matter';
    case Genealogy = 'genealogy';
    case NoChronology = 'no_chronology';
    case ProphecyBackground = 'prophecy_background';
    case YearHeading = 'year_heading';
    case Other = 'other';
}
