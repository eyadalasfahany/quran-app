<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Overlay;

/**
 * A cleaned OpenITI heading: the title (ADR 0076 §3) and whether continuation lines were joined into it.
 */
final readonly class CleanedHeading
{
    public function __construct(
        public string $title,
        public bool $hadContinuation,
    ) {}
}
