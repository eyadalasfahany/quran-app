<?php

declare(strict_types=1);

namespace App\Domains\Content\Repositories\Contracts;

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Models\Resource;
use Illuminate\Database\Eloquent\Collection;

interface ResourceRepository
{
    public function find(int $id): ?Resource;

    /**
     * Active resources that already have a pack, ordered by group then id.
     *
     * @return Collection<int, resource>
     */
    public function activeWithPacks(): Collection;

    public function sourceId(string $code): ?int;

    /**
     * @return Collection<int, resource>
     */
    public function forGroup(int $sourceId, ResourceGroup $group): Collection;

    public function findBySource(int $sourceId, ResourceGroup $group, string $sourceKey): ?Resource;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function create(array $attributes): Resource;

    public function save(Resource $resource): void;
}
