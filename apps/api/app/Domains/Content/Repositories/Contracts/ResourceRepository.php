<?php

declare(strict_types=1);

namespace App\Domains\Content\Repositories\Contracts;

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Models\Resource;

interface ResourceRepository
{
    public function sourceId(string $code): ?int;

    public function findBySource(int $sourceId, ResourceGroup $group, string $sourceKey): ?Resource;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function create(array $attributes): Resource;

    public function save(Resource $resource): void;
}
