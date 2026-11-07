<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Import\Records;

/**
 * The title matcher's verdict for one section. Reasons: accepted, empty_section, no_chapter_mapped,
 * forward_below_threshold, backward_below_threshold, chapter_has_no_title.
 */
final readonly class SectionMatch
{
    public function __construct(
        public string $bookNumber,
        public bool $accepted,
        public string $reason,
        public ?string $chapterId,
        public ?string $titleAr,
        public int $sectionSize,
        public int $forwardMatched,
        public int $chapterSize,
        public int $backwardMatched,
    ) {}

    public function forwardPercent(): float
    {
        return $this->percent($this->forwardMatched, $this->sectionSize);
    }

    public function backwardPercent(): float
    {
        return $this->percent($this->backwardMatched, $this->chapterSize);
    }

    private function percent(int $matched, int $total): float
    {
        return $total === 0 ? 0.0 : round(100 * $matched / $total, 2);
    }
}
