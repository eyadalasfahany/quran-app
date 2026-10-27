<?php

declare(strict_types=1);

namespace App\Domains\Content\Repositories\Eloquent;

use App\Domains\Content\Models\SyncRun;
use App\Domains\Content\Repositories\Contracts\SyncRunRepository;
use App\Support\Repositories\EloquentRepository;

/**
 * @extends EloquentRepository<SyncRun>
 */
final class EloquentSyncRunRepository extends EloquentRepository implements SyncRunRepository
{
    public function create(array $attributes): SyncRun
    {
        /** @var SyncRun $run */
        $run = $this->query()->create($attributes);

        return $run;
    }

    public function save(SyncRun $run): void
    {
        $run->save();
    }

    protected function model(): string
    {
        return SyncRun::class;
    }
}
