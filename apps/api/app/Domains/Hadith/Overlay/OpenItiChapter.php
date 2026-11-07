<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Overlay;

/**
 * One OpenITI chapter heading with the numbered units under it, in file order (ADR 0076 §5, step 6b.7). The title is cleaned by
 * OpenItiHeadingCleaner. Nothing here is stored; the matcher turns it into a proposal.
 */
final readonly class OpenItiChapter
{
    /**
     * @param  list<OpenItiUnit>  $units
     * @param  bool  $numberingStripped  the title had leading numbering markup removed (step 6b.7, approved G2)
     */
    public function __construct(
        public int $index,
        public string $title,
        public bool $hadContinuation,
        public array $units,
        public bool $numberingStripped = false,
    ) {}
}
