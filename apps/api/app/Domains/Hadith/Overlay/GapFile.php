<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Overlay;

/**
 * The validated shape of a committed gaps file (ADR 0076, step 6b). Semantic checks against the edition (numbers exist, targets
 * have text, book ranges do not overlap) happen in HadithOverlayBuilder.
 */
final readonly class GapFile
{
    /**
     * @param  array<string, string>  $origins  origin code => source_version
     * @param  list<GapMerge>  $merges
     * @param  list<GapFill>  $fills
     * @param  list<GapBook>  $books
     * @param  list<GapUnresolved>  $unresolved
     */
    public function __construct(
        public string $collection,
        public array $origins,
        public array $merges,
        public array $fills,
        public array $books,
        public array $unresolved,
    ) {}
}
