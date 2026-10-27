<?php

declare(strict_types=1);

namespace App\Domains\Content\Repositories\Eloquent;

use App\Domains\Content\Models\Mushaf;
use App\Domains\Content\Repositories\Contracts\MushafRepository;
use App\Support\Repositories\EloquentRepository;

/**
 * @extends EloquentRepository<Mushaf>
 */
final class EloquentMushafRepository extends EloquentRepository implements MushafRepository
{
    public function upsert(array $row): Mushaf
    {
        $existing = $this->findForResource($row['resource_id']);

        if ($existing !== null && $existing->id !== $row['id']) {
            $existing->delete();
        }

        return $this->query()->updateOrCreate(['id' => $row['id']], $row);
    }

    public function findForResource(int $resourceId): ?Mushaf
    {
        return $this->query()->where('resource_id', $resourceId)->first();
    }

    public function delete(int $id): void
    {
        $this->query()->whereKey($id)->delete();
    }

    protected function model(): string
    {
        return Mushaf::class;
    }
}
