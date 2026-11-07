<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Import\Records;

/**
 * The title matcher's verdict for one section. Reasons: accepted, empty_section, no_chapter_mapped,
 * forward_below_threshold, backward_below_threshold, chapter_has_no_title. chapterNumber is the hadithapi.com chapterNumber
 * the section matched (never a chapter id). unmappedNumbers counts the section's numbers whose chapterNumber has no chapter.
 */
final readonly class SectionMatch
{
    public function __construct(
        public string $bookNumber,
        public bool $accepted,
        public string $reason,
        public ?string $chapterNumber,
        public ?string $titleAr,
        public int $sectionSize,
        public int $forwardMatched,
        public int $chapterSize,
        public int $backwardMatched,
        public int $unmappedNumbers = 0,
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
