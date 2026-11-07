<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Services;

use App\Domains\Hadith\Import\Records\SectionMatch;

/**
 * hadith:match-book-titles (dev only, ADR 0042 §4a, ADR 0076). Pairs each fawazahmed0 section that has no hadithapi.com title with
 * the OpenITI book heading whose numbers agree with it, under the same two-way 95% rule as the hadithapi.com matcher. Pure: no I/O.
 * A section that already has a title is never proposed again.
 */
final readonly class HadithBookTitleMatcher
{
    public function __construct(private HadithSectionTitleMatcher $matcher) {}

    /**
     * @param  array<string, list<string>>  $sections  Book number => hadith numbers that have text.
     * @param  list<array{ordinal: int, title: string, numbers: list<string>}>  $books  The OpenITI book headings in file order, each with
     *                                                                                  the numbers its units map to that have text.
     * @param  list<string>  $titledBooks  Book numbers that already have a title (never overridden).
     * @return list<SectionMatch> One per section that has no title, in the order of $sections.
     */
    public function match(array $sections, array $books, array $titledBooks, int $thresholdPercent = 95): array
    {
        $open = array_diff_key($sections, array_fill_keys($titledBooks, true));
        $pairs = [];
        $chapterTitles = [];

        foreach ($books as $book) {
            $chapterKey = self::chapterKey($book['ordinal']);
            $chapterTitles[$chapterKey] = $book['title'];

            foreach ($book['numbers'] as $number) {
                $pairs[] = ['number' => $number, 'chapter_number' => $chapterKey];
            }
        }

        return $this->matcher->match($open, $pairs, $chapterTitles, $thresholdPercent);
    }

    /**
     * The OpenITI book ordinal as a chapter key. The prefix keeps the key non-numeric, so PHP never turns it into an int key.
     */
    public static function chapterKey(int $ordinal): string
    {
        return 'b'.$ordinal;
    }
}
