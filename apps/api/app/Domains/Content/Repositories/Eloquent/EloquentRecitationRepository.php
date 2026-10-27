<?php

declare(strict_types=1);

namespace App\Domains\Content\Repositories\Eloquent;

use App\Domains\Content\Models\Recitation;
use App\Domains\Content\Repositories\Contracts\RecitationRepository;
use App\Support\Repositories\EloquentRepository;

/**
 * @extends EloquentRepository<Recitation>
 */
final class EloquentRecitationRepository extends EloquentRepository implements RecitationRepository
{
    public function upsertForResource(int $resourceId, array $attributes): Recitation
    {
        return $this->query()->updateOrCreate(
            ['resource_id' => $resourceId],
            $attributes,
        );
    }

    public function findForResource(int $resourceId): ?Recitation
    {
        return $this->query()->where('resource_id', $resourceId)->first();
    }

    public function setHasWordSegments(int $id, bool $hasWordSegments): void
    {
        $this->query()->whereKey($id)->update([
            'has_word_segments' => $hasWordSegments,
        ]);
    }

    public function delete(int $id): void
    {
        $this->query()->whereKey($id)->delete();
    }

    protected function model(): string
    {
        return Recitation::class;
    }
}
