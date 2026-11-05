<?php

declare(strict_types=1);

namespace App\Support\QuranText;

use InvalidArgumentException;

/**
 * Verse counts per surah and the global verse ids they imply (numbers only, never text). The API has no verses table
 * and the Tanzil file is not in the Docker image, so the timing importer reads these constants (plan A3).
 * Global verse ids run 1..6236 in mushaf order: verse 1:1 is 1, 2:1 is 8.
 */
final class ChapterVerseCounts
{
    public const int CHAPTERS = 114;

    /** @var array<int, int> Index 0 is chapter 1. */
    public const array COUNTS = [7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6];

    public static function forChapter(int $chapter): int
    {
        self::assertChapter($chapter);

        return self::COUNTS[$chapter - 1];
    }

    public static function firstVerseId(int $chapter): int
    {
        self::assertChapter($chapter);

        return 1 + array_sum(array_slice(self::COUNTS, 0, $chapter - 1));
    }

    public static function verseId(int $chapter, int $ayah): int
    {
        $count = self::forChapter($chapter);

        if ($ayah < 1 || $ayah > $count) {
            throw new InvalidArgumentException("Ayah [{$ayah}] is outside 1 to {$count} for chapter [{$chapter}].");
        }

        return self::firstVerseId($chapter) + $ayah - 1;
    }

    public static function total(): int
    {
        return array_sum(self::COUNTS);
    }

    private static function assertChapter(int $chapter): void
    {
        if ($chapter < 1 || $chapter > self::CHAPTERS) {
            throw new InvalidArgumentException("Chapter [{$chapter}] is outside 1 to ".self::CHAPTERS.'.');
        }
    }
}
