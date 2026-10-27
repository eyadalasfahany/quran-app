<?php

declare(strict_types=1);

namespace App\Domains\Content\Repositories\Contracts;

use App\Domains\Content\Models\ContentPack;
use Carbon\CarbonImmutable;

interface ContentPackRepository
{
    public function findForVersion(int $resourceId, int $version): ?ContentPack;

    /**
     * @param  array{resource_id: int, version: int, path: string, size_bytes: int, sha256: string, row_count: int, schema_version: int, built_at: CarbonImmutable}  $attributes
     */
    public function create(array $attributes): ContentPack;
}
