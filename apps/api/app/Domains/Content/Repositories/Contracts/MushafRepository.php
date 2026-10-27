<?php

declare(strict_types=1);

namespace App\Domains\Content\Repositories\Contracts;

use App\Domains\Content\Models\Mushaf;

interface MushafRepository
{
    /**
     * @param  array{id: int, resource_id: int, name: string, description: string|null, pages_count: int, lines_per_page: int, default_font_name: string|null, mapping_mode: string|null, qirat_name: string|null}  $row
     */
    public function upsert(array $row): Mushaf;

    public function findForResource(int $resourceId): ?Mushaf;

    public function delete(int $id): void;
}
