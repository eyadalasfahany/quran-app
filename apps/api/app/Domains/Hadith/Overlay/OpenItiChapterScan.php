<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Overlay;

/**
 * The result of scanning an OpenITI file for chapters: the chapters with units, the headings without units, the line-shape census
 * and every unit (ADR 0076 §5, step 6b.7). Counts and shapes only; no text leaves this object except through the matcher.
 */
final readonly class OpenItiChapterScan
{
    /**
     * @param  list<OpenItiChapter>  $chapters  chapters that hold at least one unit, in file order
     * @param  array<string, int>  $census  line shape => count
     * @param  list<OpenItiBookHeading>  $books  the book headings in file order, with the units under each
     * @param  int  $pageMarkerHeadings  headings that would have been a boundary but hold only page markers (ADR 0076 §3)
     */
    public function __construct(
        public array $chapters,
        public int $headingsWithoutUnits,
        public array $census,
        public array $books = [],
        public int $pageMarkerHeadings = 0,
    ) {}
}
