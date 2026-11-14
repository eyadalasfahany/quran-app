<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Canonical;

use App\Domains\Seerah\Enums\SectionLevel;

/**
 * One heading of the book with its paragraph range. `number` is the ordinal of a Bab or Fasl (the book's own word, read as a
 * number); `printedNumber` is the number the book prints inside a numbered heading (`N ( title ) N`), as text. The paragraph
 * range is null for a heading with no paragraph of its own.
 */
final readonly class CanonicalSection
{
    public function __construct(
        public string $id,
        public SectionLevel $level,
        public ?int $number,
        public ?string $printedNumber,
        public ?string $parentId,
        public string $title,
        public int $page,
        public ?string $paragraphFrom,
        public ?string $paragraphTo,
    ) {}
}
