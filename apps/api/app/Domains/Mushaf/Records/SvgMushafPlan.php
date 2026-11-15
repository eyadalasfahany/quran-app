<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Records;

/**
 * Everything one import writes, built only after checks A1 and A2 pass.
 *
 * @phpstan-type PageRow array{page: int, svg_blob_sha: string, svg_bytes: int, gz_sha256: string, gz_bytes: int}
 * @phpstan-type RegionRow array{page: int, surah: int, ayah: int, label_x: float|null, label_y: float|null, polygon: string}
 */
final readonly class SvgMushafPlan
{
    /**
     * @param  list<PageRow>  $pages
     * @param  list<RegionRow>  $regions
     */
    public function __construct(
        public string $key,
        public string $folder,
        public int $editionYear,
        public string $commit,
        public int $pageCount,
        public int $ayahCount,
        public array $pages,
        public array $regions,
    ) {}
}
