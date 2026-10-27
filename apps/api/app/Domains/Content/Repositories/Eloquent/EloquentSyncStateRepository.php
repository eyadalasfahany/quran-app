<?php

declare(strict_types=1);

namespace App\Domains\Content\Repositories\Eloquent;

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Enums\SyncEnvironment;
use App\Domains\Content\Models\SyncState;
use App\Domains\Content\Repositories\Contracts\SyncStateRepository;
use App\Support\Repositories\EloquentRepository;

/**
 * @extends EloquentRepository<SyncState>
 */
final class EloquentSyncStateRepository extends EloquentRepository implements SyncStateRepository
{
    public function find(SyncEnvironment $environment, ResourceGroup $group): ?SyncState
    {
        return $this->query()
            ->where('environment', $environment->value)
            ->where('resource_group', $group->value)
            ->first();
    }

    public function create(array $attributes): SyncState
    {
        /** @var SyncState $state */
        $state = $this->query()->create($attributes);

        return $state;
    }

    public function save(SyncState $state): void
    {
        $state->save();
    }

    protected function model(): string
    {
        return SyncState::class;
    }
}
