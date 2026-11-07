<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Overlay;

/**
 * One numbered unit of an OpenITI file, in file order (ADR 0076, step 6b.6). lines[0] is the marker line; markerEnd is the byte
 * offset where the marker match ends in that line. index is the unit's position in file order (set by unitsOf; -1 when built
 * by hand), the key of the alignment file.
 */
final readonly class OpenItiUnit
{
    /**
     * @param  list<string>  $lines
     */
    public function __construct(
        public ?int $number,
        public array $lines,
        public int $markerEnd,
        public int $lineIndex,
        public int $index = -1,
    ) {}
}
