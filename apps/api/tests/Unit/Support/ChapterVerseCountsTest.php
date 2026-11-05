<?php

declare(strict_types=1);

use App\Support\QuranText\ChapterVerseCounts;
use App\Support\QuranText\TanzilReader;
use Tests\TestCase;

uses(TestCase::class);

it('has 114 chapters summing to 6236', function (): void {
    expect(ChapterVerseCounts::COUNTS)->toHaveCount(114)
        ->and(ChapterVerseCounts::total())->toBe(6236);
});

it('numbers verses globally', function (): void {
    expect(ChapterVerseCounts::verseId(1, 1))->toBe(1)
        ->and(ChapterVerseCounts::verseId(2, 1))->toBe(8)
        ->and(ChapterVerseCounts::verseId(114, ChapterVerseCounts::forChapter(114)))->toBe(6236)
        ->and(ChapterVerseCounts::firstVerseId(114))->toBe(6236 - ChapterVerseCounts::forChapter(114) + 1);
});

it('rejects an out of range chapter or ayah', function (): void {
    expect(fn () => ChapterVerseCounts::forChapter(0))->toThrow(InvalidArgumentException::class)
        ->and(fn () => ChapterVerseCounts::forChapter(115))->toThrow(InvalidArgumentException::class)
        ->and(fn () => ChapterVerseCounts::firstVerseId(0))->toThrow(InvalidArgumentException::class)
        ->and(fn () => ChapterVerseCounts::verseId(1, 0))->toThrow(InvalidArgumentException::class)
        ->and(fn () => ChapterVerseCounts::verseId(1, 8))->toThrow(InvalidArgumentException::class);
});

it('matches the Tanzil file', function (): void {
    $path = TanzilReader::simplePath();

    if (! is_file($path)) {
        $this->markTestSkipped('The Tanzil text is not present.');
    }

    $counts = array_fill(1, 114, 0);

    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        if (str_starts_with($line, '#')) {
            continue;
        }

        $surah = (int) explode('|', $line, 2)[0];
        $counts[$surah]++;
    }

    foreach (range(1, 114) as $chapter) {
        expect($counts[$chapter])->toBe(ChapterVerseCounts::forChapter($chapter));
    }
});
