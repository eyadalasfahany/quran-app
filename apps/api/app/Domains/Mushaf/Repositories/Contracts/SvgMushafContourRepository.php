<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Repositories\Contracts;

use App\Domains\Mushaf\Enums\WordBoxesStatus;

/**
 * @phpstan-import-type WordRow from \App\Domains\Mushaf\Records\ContourMap
 * @phpstan-import-type BlockRow from \App\Domains\Mushaf\Records\ContourMap
 */
interface SvgMushafContourRepository
{
    /**
     * Replaces the edition's contour rows and records the map's status and digest. The caller wraps this in a transaction.
     *
     * @param  list<WordRow>  $wordRows
     * @param  list<BlockRow>  $blockRows
     */
    public function replace(int $svgMushafId, array $wordRows, array $blockRows, WordBoxesStatus $status, string $digest): void;
}
