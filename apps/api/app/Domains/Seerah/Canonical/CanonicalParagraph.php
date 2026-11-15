<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Canonical;

/**
 * One paragraph of the canonical text. `page` is the page in force where the paragraph's first line begins.
 */
final readonly class CanonicalParagraph
{
    public function __construct(
        public string $id,
        public string $sectionId,
        public int $page,
        public string $text,
    ) {}
}
