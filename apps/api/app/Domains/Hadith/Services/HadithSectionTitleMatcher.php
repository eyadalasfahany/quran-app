<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Services;

use App\Domains\Hadith\Import\Records\SectionMatch;

/**
 * The strict two-way 95% rule for section titles (ADR 0042 §4a, step 6). Pure: no I/O. Numbers align by exact string.
 * A number that maps to more than one chapter is ambiguous and never counts as matched.
 */
final class HadithSectionTitleMatcher
{
    /**
     * @param  array<string, list<string>>  $sections  Book number => hadith numbers that have text.
     * @param  list<array{number: string, chapter_id: string}>  $pairs  hadithapi.com hadith => chapter.
     * @param  array<string, ?string>  $chapterTitles  Chapter id => chapterArabic, as received.
     * @return list<SectionMatch> One per section, in the order of $sections.
     */
    public function match(array $sections, array $pairs, array $chapterTitles, int $thresholdPercent = 95): array
    {
        $numberChapters = [];
        $chapterNumbers = [];

        foreach ($pairs as $pair) {
            $numberChapters[$pair['number']][$pair['chapter_id']] = true;
            $chapterNumbers[$pair['chapter_id']][$pair['number']] = true;
        }

        $results = [];

        foreach ($sections as $bookKey => $numbers) {
            $bookNumber = (string) $bookKey;
            $total = count($numbers);

            if ($total === 0) {
                $results[] = $this->rejected($bookNumber, 'empty_section', null, 0, 0, 0, 0);

                continue;
            }

            $tally = [];

            foreach ($numbers as $number) {
                $chapters = $numberChapters[$number] ?? [];

                if (count($chapters) !== 1) {
                    continue;
                }

                $chapter = (string) array_key_first($chapters);
                $tally[$chapter] = ($tally[$chapter] ?? 0) + 1;
            }

            if ($tally === []) {
                $results[] = $this->rejected($bookNumber, 'no_chapter_mapped', null, $total, 0, 0, 0);

                continue;
            }

            $best = $this->bestChapter($tally);
            $forwardMatched = $tally[$best];
            $chapterSize = count($chapterNumbers[$best] ?? []);
            $inSection = array_fill_keys($numbers, true);
            $backwardMatched = 0;

            foreach (array_keys($chapterNumbers[$best] ?? []) as $chapterNumber) {
                $number = (string) $chapterNumber;

                if (isset($inSection[$number]) && count($numberChapters[$number] ?? []) === 1) {
                    $backwardMatched++;
                }
            }

            if (! $this->meets($forwardMatched, $total, $thresholdPercent)) {
                $results[] = $this->rejected($bookNumber, 'forward_below_threshold', $best, $total, $forwardMatched, $chapterSize, $backwardMatched);

                continue;
            }

            if (! $this->meets($backwardMatched, $chapterSize, $thresholdPercent)) {
                $results[] = $this->rejected($bookNumber, 'backward_below_threshold', $best, $total, $forwardMatched, $chapterSize, $backwardMatched);

                continue;
            }

            $title = $chapterTitles[$best] ?? null;

            if (! is_string($title) || $title === '') {
                $results[] = $this->rejected($bookNumber, 'chapter_has_no_title', $best, $total, $forwardMatched, $chapterSize, $backwardMatched);

                continue;
            }

            $results[] = new SectionMatch($bookNumber, true, 'accepted', $best, $title, $total, $forwardMatched, $chapterSize, $backwardMatched);
        }

        return $results;
    }

    /**
     * The highest tally; ties go to the smaller chapter id by strcmp.
     *
     * @param  array<string, int>  $tally
     */
    private function bestChapter(array $tally): string
    {
        $best = null;

        foreach ($tally as $chapter => $count) {
            $chapter = (string) $chapter;

            if ($best === null || $count > $tally[$best] || ($count === $tally[$best] && strcmp($chapter, $best) < 0)) {
                $best = $chapter;
            }
        }

        return (string) $best;
    }

    private function meets(int $matched, int $total, int $thresholdPercent): bool
    {
        return $matched * 100 >= $total * $thresholdPercent;
    }

    private function rejected(string $bookNumber, string $reason, ?string $chapterId, int $sectionSize, int $forwardMatched, int $chapterSize, int $backwardMatched): SectionMatch
    {
        return new SectionMatch($bookNumber, false, $reason, $chapterId, null, $sectionSize, $forwardMatched, $chapterSize, $backwardMatched);
    }
}
