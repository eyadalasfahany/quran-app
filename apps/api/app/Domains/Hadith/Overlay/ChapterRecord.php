<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Overlay;

/**
 * One OpenITI chapter: its ordinal in the book, its book number, its first and last hadith number, and its cleaned title
 * (ADR 0076 §2 and §5, step 6b.5). No hadith text and no statistics.
 */
final readonly class ChapterRecord
{
    public function __construct(
        public int $ordinal,
        public string $bookNumber,
        public string $first,
        public string $last,
        public string $titleAr,
    ) {}
}
