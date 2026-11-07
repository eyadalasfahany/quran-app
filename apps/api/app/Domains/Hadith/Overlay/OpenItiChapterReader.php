<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Overlay;

/**
 * Scans an OpenITI file for chapters (ADR 0076 §5, brief 9.2 and 9.3, step 6b.7). A chapter starts at a chapter heading and holds
 * the numbered units until the next chapter or book heading. A heading whose cleaned title starts with كتاب or أبواب always ends
 * the chapter and is never a chapter. Headings with no unit are not chapters and are counted. Pure: bytes in, scan out.
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

        foreach ($lines as $index => $line) {
            if (preg_match($unitStart, $line) === 1) {
                $census['unit_marker']++;

                continue;
            }

            if (str_starts_with($line, '###')) {
                $census['heading']++;
                $title = $this->headings->clean($this->headingLines($lines, $index))->title;
                $title = (string) preg_replace('~^[0-9]+\s*-\s*~u', '', $title);

                if (($bookRx !== null && preg_match($bookRx, $line) === 1) || preg_match(self::BOOK_WORD, $title) === 1) {
                    $boundaries[] = ['kind' => 'book', 'index' => $index];
                } elseif ($chapterRx !== null && preg_match($chapterRx, $line) === 1) {
                    $boundaries[] = ['kind' => 'chapter', 'index' => $index];
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
        $headingsWithoutUnits = 0;

        foreach ($boundaries as $position => $boundary) {
            if ($boundary['kind'] !== 'chapter') {
                continue;
            }

            $end = $boundaries[$position + 1]['index'] ?? PHP_INT_MAX;
            $under = array_values(array_filter($units, static fn (OpenItiUnit $unit): bool => $unit->lineIndex > $boundary['index'] && $unit->lineIndex < $end));

            if ($under === []) {
                $headingsWithoutUnits++;

                continue;
            }

            $heading = $this->headings->clean($this->headingLines($lines, $boundary['index']));
            $chapters[] = new OpenItiChapter(count($chapters) + 1, $heading->title, $heading->hadContinuation, $under);
        }

        return new OpenItiChapterScan($chapters, $headingsWithoutUnits, $census);
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
