<?php

declare(strict_types=1);

namespace App\Domains\Content\Repositories\Contracts;

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Enums\SyncEnvironment;
use App\Domains\Content\Models\SyncState;

interface SyncStateRepository
{
    public function find(SyncEnvironment $environment, ResourceGroup $group): ?SyncState;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function create(array $attributes): SyncState;

    public function save(SyncState $state): void;
}
