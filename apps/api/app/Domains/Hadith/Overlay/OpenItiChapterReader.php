<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Overlay;

/**
 * Scans an OpenITI file for chapters (ADR 0076 §5, brief 9.2 and 9.3, step 6b.7). A chapter starts at a chapter heading and holds
 * the numbered units until the next chapter or book heading. A heading whose cleaned title starts with كتاب or أبواب always ends
 * the chapter and is never a chapter. A heading whose title is only page markers (ADR 0076 §3) is skipped: it is no boundary. Headings with no unit are not chapters and are counted. Pure: bytes in, scan out.
 */
final class OpenItiChapterReader
{
    private const string BOOK_WORD = '~^(كتاب|أبواب)(\s|$)~u';

    public function __construct(
        private readonly OpenItiUnitReader $units,
        private readonly OpenItiHeadingCleaner $headings,
    ) {}

    /**
     * @param  string|null  $chapterRx  the chapter heading pattern (markup.chapter); null means the file has no chapters
     * @param  string|null  $bookRx  the book heading pattern (markup.book); null means books come from the title words only
     */
    public function scan(string $bytes, string $unitStart, string $unitStop, ?string $chapterRx, ?string $bookRx): OpenItiChapterScan
    {
        $lines = $this->units->bodyLines($bytes);
        $units = $this->units->unitsOf($bytes, $unitStart, $unitStop);
        $census = ['unit_marker' => 0, 'heading' => 0, 'continuation' => 0, 'page_marker' => 0, 'other' => 0];
        $boundaries = [];
        $pageMarkerHeadings = 0;

        foreach ($lines as $index => $line) {
            if (preg_match($unitStart, $line) === 1) {
                $census['unit_marker']++;

                continue;
            }

            if ($this->isHeading($line)) {
                $census['heading']++;
                $heading = $this->headings->clean($this->headingLines($lines, $index));
                $cleaned = $heading->title;
                $isBook = ($bookRx !== null && preg_match($bookRx, $line) === 1) || preg_match(self::BOOK_WORD, $this->bookTitle($cleaned)) === 1;
                $isChapter = ! $isBook && $chapterRx !== null && preg_match($chapterRx, $line) === 1;
                [$title, $numberingStripped] = $this->chapterTitle($cleaned);

                if ($title === '') {
                    // A heading that is only page markers is not a boundary: its units continue the current chapter (ADR 0076 §3).
                    if (($isBook || $isChapter) && OpenItiPageMarkers::contains($cleaned)) {
                        $pageMarkerHeadings++;
                    }

                    continue;
                }

                if ($isBook) {
                    $boundaries[] = ['kind' => 'book', 'index' => $index, 'title' => $this->bookTitle($cleaned), 'numbering' => false, 'continuation' => $heading->hadContinuation];
                } elseif ($isChapter) {
                    $boundaries[] = ['kind' => 'chapter', 'index' => $index, 'title' => $title, 'numbering' => $numberingStripped, 'continuation' => $heading->hadContinuation];
                }

                continue;
            }

            if (str_starts_with($line, '~~')) {
                $census['continuation']++;

                continue;
            }

            if (str_contains($line, 'PageV')) {
                $census['page_marker']++;

                continue;
            }

            if ($line !== '') {
                $census['other']++;
            }
        }

        $chapters = [];
        $books = [];
        $headingsWithoutUnits = 0;

        foreach ($boundaries as $position => $boundary) {
            if ($boundary['kind'] === 'book') {
                $bookEnd = $this->nextBookIndex($boundaries, $position);
                $bookUnits = array_values(array_filter($units, static fn (OpenItiUnit $unit): bool => $unit->lineIndex > $boundary['index'] && $unit->lineIndex < $bookEnd));
                $books[] = new OpenItiBookHeading($boundary['title'], $bookUnits);

                continue;
            }

            $end = $boundaries[$position + 1]['index'] ?? PHP_INT_MAX;

            $under = array_values(array_filter($units, static fn (OpenItiUnit $unit): bool => $unit->lineIndex > $boundary['index'] && $unit->lineIndex < $end));

            if ($under === []) {
                $headingsWithoutUnits++;

                continue;
            }

            $chapters[] = new OpenItiChapter(count($chapters) + 1, $boundary['title'], $boundary['continuation'], $under, $boundary['numbering']);
        }

        return new OpenItiChapterScan($chapters, $headingsWithoutUnits, $census, $books, $pageMarkerHeadings);
    }

    /**
     * The index of the next book heading after the boundary at $position, or PHP_INT_MAX when there is none. A book runs to it.
     *
     * @param  list<array{kind: string, index: int, title: string, numbering: bool, continuation: bool}>  $boundaries
     */
    private function nextBookIndex(array $boundaries, int $position): int
    {
        for ($next = $position + 1; isset($boundaries[$next]); $next++) {
            if ($boundaries[$next]['kind'] === 'book') {
                return $boundaries[$next]['index'];
            }
        }

        return PHP_INT_MAX;
    }

    /**
     * The book title as printed: the cleaned heading without its numbering prefix («N - » in Nasa'i, «N ( N ) » in Muslim and Malik)
     * and without page markers. Used for the book test and as the stored book title.
     */
    private function bookTitle(string $cleaned): string
    {
        $withoutDash = (string) preg_replace('~^[0-9]+\s*-\s*~u', '', $cleaned);
        [$title] = $this->stripNumbering($withoutDash);

        return OpenItiPageMarkers::strip($title);
    }

    /**
     * The chapter title: the numbering prefix removed (approved G2), then the page markers (ADR 0076 §3).
     *
     * @return array{string, bool} the title and whether a numbering prefix was removed
     */
    private function chapterTitle(string $cleaned): array
    {
        [$title, $numberingStripped] = $this->stripNumbering($cleaned);

        return [OpenItiPageMarkers::strip($title), $numberingStripped];
    }

    /**
     * Removes the numbering markup that some chapter titles start with (approved G2, step 6b.7): «(N) » (Tirmidhi style) and
     * «N ( N ) », «N ( N » or «N (» (Muslim and Malik style), where N is ASCII or Arabic-Indic digits. Only the chapter title path calls this.
     *
     * @return array{string, bool} the title and whether a prefix was removed
     */
    private function stripNumbering(string $title): array
    {
        $digits = '[0-9\x{0660}-\x{0669}]+';
        $stripped = (string) preg_replace('~^(?:\(\s*'.$digits.'\s*\)|'.$digits.'\s*\(\s*(?:'.$digits.'\s*\)?)?)\s+~u', '', $title, 1, $count);

        // «N ( N title )»: the bracket the numbering opens closes at the end of the title, so a left-over «)» goes with it.
        // One Malik heading drops the «(» («N title )»); its bare number goes too.
        if (substr_count($stripped, ')') > substr_count($stripped, '(') && preg_match('~\)\s*$~u', $stripped) === 1) {
            $stripped = (string) preg_replace('~\s*\)\s*$~u', '', $stripped);

            if ($count === 0) {
                $stripped = (string) preg_replace('~^'.$digits.'\s+~u', '', $stripped, 1, $count);
            }
        }

        // OpenITI's Quran-quote tags (@QB@ … @QE@) are markup, never title text.
        $stripped = trim((string) preg_replace('~\s*@Q[BE]@\s*~u', ' ', $stripped), " \t");

        return [$stripped, $count === 1];
    }

    /**
     * A heading starts with ### (Bukhari, Tirmidhi and the rest) or with a single # and a pipe (Muslim, Malik). A numbered unit
     * starts with # and a digit, so it is never a heading.
     */
    private function isHeading(string $line): bool
    {
        return str_starts_with($line, '###') || str_starts_with($line, '# |');
    }

    /**
     * The heading line and the ~~ continuation lines right after it.
     *
     * @param  list<string>  $lines
     * @return list<string>
     */
    private function headingLines(array $lines, int $index): array
    {
        $heading = [$lines[$index]];

        for ($next = $index + 1; isset($lines[$next]) && str_starts_with($lines[$next], '~~'); $next++) {
            $heading[] = $lines[$next];
        }

        return $heading;
    }
}
