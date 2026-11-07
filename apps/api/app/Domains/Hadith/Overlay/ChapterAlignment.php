<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Overlay;

/**
 * The validated text-free alignment of one collection's OpenITI units to fawazahmed0 hadith numbers (ADR 0076 §5, step 6b.7).
 * Keyed by the unit's index in file order; a unit that is not in the file is not aligned and counts as not listed.
 */
final readonly class ChapterAlignment
{
    /**
     * @param  array<int, string>  $numberByUnit  OpenITI unit index => fawazahmed0 hadith number (exact string)
     */
    public function __construct(
        public string $collection,
        public array $numberByUnit,
    ) {}

    public function numberOf(int $unitIndex): ?string
    {
        return $this->numberByUnit[$unitIndex] ?? null;
    }

    public function count(): int
    {
        return count($this->numberByUnit);
    }
}
