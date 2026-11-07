<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Overlay;

/**
 * One numbered unit of an OpenITI file, in file order (ADR 0076, step 6b.6). lines[0] is the marker line; markerEnd is the byte
 * offset where the marker match ends in that line.
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
    ) {}
}
