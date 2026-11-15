<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Canonical;

use App\Domains\Seerah\Enums\SectionLevel;

/**
 * A section while the book is being assembled: its paragraph range grows as paragraphs are added.
 */
final class SectionDraft
{
    public ?string $paragraphFrom = null;

    public ?string $paragraphTo = null;

    public function __construct(
        public readonly string $id,
        public readonly SectionLevel $level,
        public readonly string $title,
        public readonly int $page,
    ) {}

    public function toSection(): CanonicalSection
    {
        return new CanonicalSection(
            id: $this->id,
            level: $this->level,
            title: $this->title,
            page: $this->page,
            paragraphFrom: $this->paragraphFrom,
            paragraphTo: $this->paragraphTo,
        );
    }
}
