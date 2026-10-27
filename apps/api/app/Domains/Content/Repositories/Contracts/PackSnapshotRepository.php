<?php

declare(strict_types=1);

namespace App\Domains\Content\Repositories\Contracts;

use App\Domains\Content\Packs\PackTable;

interface PackSnapshotRepository
{
    /**
     * @param  callable(list<array<string, int|string|null>>): void  $consume
     */
    public function eachChunk(int $resourceId, PackTable $table, callable $consume): void;
}
