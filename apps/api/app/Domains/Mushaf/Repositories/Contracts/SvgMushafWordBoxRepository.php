<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Repositories\Contracts;

use App\Domains\Mushaf\Enums\WordBoxesStatus;

/**
 * @phpstan-type WordBoxRow array{page: int, line: int, surah: int, ayah: int, position: int, x0: float, y0: float, x1: float, y1: float}
 */
interface SvgMushafWordBoxRepository
{
    /**
     * The imported edition's id, or null when `mushaf:import` has not run for it.
     */
    public function editionId(string $key): ?int;

    /**
     * @return array<int, list<array{surah: int, ayah: int, polygon: string}>> page => the page's ayah regions
     */
    public function regions(int $svgMushafId): array;

    /**
     * Replaces the edition's word boxes and records the build's status and digest. The caller wraps this in a transaction.
     *
     * @param  list<WordBoxRow>  $rows
     */
    public function replace(int $svgMushafId, array $rows, WordBoxesStatus $status, string $digest): void;
}
