<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Overlay;

/**
 * A book the edition lacks, inserted after a section (ADR 0076 decision 4, step 6b.4). A null book number is undecided and is refused.
 */
final readonly class GapBook
{
    public function __construct(
        public ?string $bookNumber,
        public string $afterBook,
        public string $first,
        public string $last,
        public string $titleAr,
        public string $origin,
        public string $sourceKey,
    ) {}
}
