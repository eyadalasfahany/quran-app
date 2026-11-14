<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Enums;

/**
 * The level of a book section (ADR 0089, data-format.md): the Bab and Fasl lines of the book, its numbered and unnumbered
 * headings, and the front matter before the first heading (none in the pinned edition).
 */
enum SectionLevel: string
{
    case Front = 'front';
    case Bab = 'bab';
    case Fasl = 'fasl';
    case Heading = 'heading';

    /**
     * Depth in the section tree. A Bab contains Fasl, a Fasl contains headings; front matter is never a parent.
     */
    public function rank(): int
    {
        return match ($this) {
            self::Front => 0,
            self::Bab => 1,
            self::Fasl => 2,
            self::Heading => 3,
        };
    }
}
