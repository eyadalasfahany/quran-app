<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Enums;

/**
 * The level of a book section. The pinned Shamela edition (book 23692) has flat headings only; its editor's preface and
 * opening formula are `front`, every other heading is `heading`. Configured in config/seerah.php (front_headings).
 */
enum SectionLevel: string
{
    case Front = 'front';
    case Heading = 'heading';
}
