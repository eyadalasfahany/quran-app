<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Overlay;

/**
 * A book heading (كتاب or أبواب) of an OpenITI file with the units that run under it, up to the next book heading (ADR 0076 §5).
 */
final readonly class OpenItiBookHeading
{
    /**
     * @param  list<OpenItiUnit>  $units  the units of the book, in file order (chapters inside the book included)
     */
    public function __construct(
        public string $title,
        public array $units,
    ) {}
}
