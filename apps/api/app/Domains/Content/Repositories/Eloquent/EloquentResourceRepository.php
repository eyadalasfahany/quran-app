<?php

declare(strict_types=1);

namespace App\Domains\Content\Repositories\Eloquent;

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Repositories\Contracts\ResourceRepository;
use App\Support\Repositories\EloquentRepository;
use Illuminate\Database\Eloquent\Collection;

/**
 * @extends EloquentRepository<resource>
 */
final class EloquentResourceRepository extends EloquentRepository implements ResourceRepository
{
    public function find(int $id): ?Resource
    {
        $resource = $this->query()->find($id);

        return $resource instanceof Resource ? $resource : null;
    }

    public function activeWithPacks(): Collection
    {
        /** @var Collection<int, resource> $resources */
        $resources = $this->query()
            ->where('is_active', true)
            ->whereNotIn('group', ResourceGroup::ignoredValues())
            ->whereHas('contentPacks')
            ->with(['contentPacks', 'recitation'])
            ->orderBy('group')
            ->orderBy('id')
            ->get();

        return $resources;
    }

    public function forGroup(int $sourceId, ResourceGroup $group): Collection
    {
        /** @var Collection<int, resource> $resources */
        $resources = $this->query()
            ->where('source_id', $sourceId)
            ->where('group', $group)
            ->orderBy('id')
            ->get();

        return $resources;
    }

    public function sourceId(string $code): ?int
    {
        $id = ContentSource::query()->where('code', $code)->value('id');

        if (is_int($id)) {
            return $id;
        }

        if (is_string($id) && preg_match('/^[0-9]+$/', $id) === 1) {
            return (int) $id;
        }

        return null;
    }

    public function findBySource(int $sourceId, ResourceGroup $group, string $sourceKey): ?Resource
    {
        return $this->query()
            ->where('source_id', $sourceId)
            ->where('group', $group->value)
            ->where('source_key', $sourceKey)
            ->first();
    }

    public function create(array $attributes): Resource
    {
        /** @var resource $resource */
        $resource = $this->query()->create($attributes);

        return $resource;
    }

    public function save(Resource $resource): void
    {
        $resource->save();
    }

    protected function model(): string
    {
        return Resource::class;
    }
}
