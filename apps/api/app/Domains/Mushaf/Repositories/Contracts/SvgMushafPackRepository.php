<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Repositories\Contracts;

use App\Domains\Mushaf\Models\SvgMushaf;

/**
 * Reads an imported edition for its pack. Rows are streamed, so a pack never holds a whole edition in memory.
 *
 * @phpstan-type PackPageRow array{page: int, gz_sha256: string, gz_bytes: int}
 * @phpstan-type PackRegionRow array{page: int, surah: int, ayah: int, label_x: string|null, label_y: string|null, polygon: string}
 * @phpstan-type PackWordBoxRow array{page: int, line: int, surah: int, ayah: int, position: int, x0: string, y0: string, x1: string, y1: string}
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
}
