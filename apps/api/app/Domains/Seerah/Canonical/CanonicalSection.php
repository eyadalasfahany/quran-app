<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Canonical;

use App\Domains\Seerah\Enums\SectionLevel;

/**
 * One heading of the book with its paragraph range. `page` is the page in force where the heading begins. The paragraph range
 * is null for a heading with no paragraph of its own (an empty body).
 */
final readonly class CanonicalSection
{
    public function __construct(
        public string $id,
        public SectionLevel $level,
        public string $title,
        public int $page,
        public ?string $paragraphFrom,
        public ?string $paragraphTo,
    ) {}
}
