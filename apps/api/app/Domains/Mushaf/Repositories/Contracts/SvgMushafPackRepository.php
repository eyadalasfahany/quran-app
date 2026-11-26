<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Repositories\Contracts;

use App\Domains\Mushaf\Models\SvgMushaf;

/**
 * Reads an imported edition for its pack. Rows are streamed, so a pack never holds a whole edition in memory.
 *
 * @phpstan-type PackPageRow array{page: int, tqp_sha256: string|null, tqp_bytes: int|null}
 * @phpstan-type PackRegionRow array{page: int, surah: int, ayah: int, label_x: string|null, label_y: string|null, polygon: string}
 * @phpstan-type PackWordBoxRow array{page: int, line: int, surah: int, ayah: int, position: int, x0: string, y0: string, x1: string, y1: string}
 * @phpstan-type PackWordContourRow array{surah: int, ayah: int, position: int, first: int, count: int, flag: int}
 * @phpstan-type PackContourBlockRow array{page: int, kind: int, ord: int, surah: int, ayah: int, first: int, count: int, x0: int, y0: int, x1: int, y1: int}
 */
interface SvgMushafPackRepository
{
    public function findByKey(string $key): ?SvgMushaf;

    /**
     * @return iterable<int, PackPageRow>
     */
    public function pages(int $svgMushafId): iterable;

    /**
     * @return iterable<int, PackRegionRow>
     */
    public function regions(int $svgMushafId): iterable;

    /**
     * @return iterable<int, PackWordBoxRow>
     */
    public function wordBoxes(int $svgMushafId): iterable;

    /**
     * @return iterable<int, PackWordContourRow>
     */
    public function wordContours(int $svgMushafId): iterable;

    /**
     * @return iterable<int, PackContourBlockRow>
     */
    public function contourBlocks(int $svgMushafId): iterable;
}
