<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Records;

/**
 * What the contour map build found (ADR 0090 step 13 A3). Keys and numbers only, never Quran text.
 *
 * @phpstan-type WordRow array{surah: int, ayah: int, position: int, first: int, count: int, flag: int}
 * @phpstan-type BlockRow array{page: int, kind: int, ord: int, surah: int, ayah: int, first: int, count: int, x0: int, y0: int, x1: int, y1: int}
 * @phpstan-type Attachment array{page: int, line: int, contour: int, loose: int, target: string, distance: float, mode: string, box: list<float>}
 */
final readonly class ContourMap
{
    /**
     * @param  list<WordRow>  $wordRows  word runs: flag 0 for the builder's own contours, 1 for a loose attachment
     * @param  list<BlockRow>  $blockRows  kind 1 blocks, 2 ayah marks, 3 sajda lines, 4 hizb ornaments, 5 keep-together runs, 6 further runs of a kind 1 block, 7 a word kept with the next word across an ayah mark; bounds in 1/32 page units
     * @param  array{W9: int, W10: int, W11: int}  $checks  failing units per gate
     * @param  list<string>  $issues  one printable line per failing unit
     * @param  list<Attachment>  $attachments  every loose contour attached to a word, for the review sheet
     */
    public function __construct(
        public array $wordRows,
        public array $blockRows,
        public array $checks,
        public array $issues,
        public array $attachments,
        public int $sajdaLines,
        public int $sajdaPages,
        public int $hizbOrnaments,
    ) {}
}
