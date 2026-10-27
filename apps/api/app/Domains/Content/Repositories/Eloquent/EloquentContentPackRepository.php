<?php

declare(strict_types=1);

namespace App\Domains\Content\Repositories\Eloquent;

use App\Domains\Content\Models\ContentPack;
use App\Domains\Content\Repositories\Contracts\ContentPackRepository;
use App\Support\Repositories\EloquentRepository;

/**
 * @extends EloquentRepository<ContentPack>
 */
final class EloquentContentPackRepository extends EloquentRepository implements ContentPackRepository
{
    public function findForVersion(int $resourceId, int $version): ?ContentPack
    {
        return $this->query()
            ->where('resource_id', $resourceId)
            ->where('version', $version)
            ->first();
    }

    public function create(array $attributes): ContentPack
    {
        /** @var ContentPack $pack */
        $pack = $this->query()->create($attributes);

        return $pack;
    }

    protected function model(): string
    {
        return ContentPack::class;
    }
}
