<?php

declare(strict_types=1);

namespace App\Domains\Content\Repositories\Eloquent;

use App\Domains\Content\Data\ContentChangeData;
use App\Domains\Content\Models\ContentChange;
use App\Domains\Content\Repositories\Contracts\ContentChangeRepository;
use App\Support\Repositories\EloquentRepository;

/**
 * @extends EloquentRepository<ContentChange>
 */
final class EloquentContentChangeRepository extends EloquentRepository implements ContentChangeRepository
{
    public function insert(int $resourceId, int $version, ContentChangeData $change): void
    {
        $this->query()->create([
            'resource_id' => $resourceId,
            'version' => $version,
            'entity' => $change->entity,
            'entity_key' => $change->entityKey,
            'op' => $change->op,
            'payload' => $change->payload,
        ]);
    }

    protected function model(): string
    {
        return ContentChange::class;
    }
}
