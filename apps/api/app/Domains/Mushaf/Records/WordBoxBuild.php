<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Records;

use App\Domains\Mushaf\Enums\WordBoxesStatus;

/**
 * What one mushaf:build-word-boxes run found. Keys and numbers only, never Quran text.
 *
 * @phpstan-type SheetBox array{line: int, surah: int, ayah: int, position: int, label: string, x0: float, y0: float, x1: float, y1: float, contours: list<int>, flags: list<string>}
 * @phpstan-type Box array{0: float, 1: float, 2: float, 3: float}
 */
final readonly class WordBoxBuild
{
    /**
     * @param  array<string, int>  $counts  W1 and W6 in pages, W3 and W8 in lines, the rest in words or overrides
     * @param  list<string>  $issues  one printable line per failing page or flagged line
     * @param  array<int, list<SheetBox>>  $pageBoxes  page => its boxes, keyed by quran-text position; `label` gives the app positions
     * @param  array<int, list<string>>  $pageChecks  page => the checks that failed or flagged on it
     * @param  array<int, array<int, list<Box>>>  $flaggedLines  page => line => the line's contours in normalized order
     * @param  array<string, array<string, float>>  $distributions  name => percentile => value, over lines nothing flagged
     * @param  array<string, array{reason: string, state: string}>  $overrides  "page:line" => the reviewer's reason, and whether the build applied, refused or never reached it
     * @param  array<string, string>  $needsDeveloper  "page:line" => why the review left the line to the developer
     * @param  array<string, array{page: int, from: int, to: int, reason: string}>  $wordLines  "surah:ayah:position" => the reviewer's line correction
     */
    public function __construct(
        public string $key,
        public int $pages,
        public int $words,
        public float $lineHeight,
        public array $counts,
        public array $issues,
        public array $pageBoxes,
        public array $pageChecks,
        public array $flaggedLines,
        public array $distributions,
        public string $digest,
        public WordBoxesStatus $status,
        public string $output,
        public int $outputBytes,
        public array $overrides = [],
        public array $needsDeveloper = [],
        public array $wordLines = [],
    ) {}
}
