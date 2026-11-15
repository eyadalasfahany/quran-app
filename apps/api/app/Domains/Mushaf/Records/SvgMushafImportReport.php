<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Records;

/**
 * What mushaf:import prints after a successful import.
 */
final readonly class SvgMushafImportReport
{
    public function __construct(
        public string $key,
        public int $pages,
        public int $regions,
        public int $ayahs,
        public int $svgBytes,
        public int $gzipBytes,
    ) {}
}
