<?php

declare(strict_types=1);

namespace App\Domains\Content\Repositories\Eloquent;

use App\Domains\Content\Data\ContentChangeData;
use App\Domains\Content\Models\ContentChange;
use App\Domains\Content\Repositories\Contracts\ContentChangeRepository;
use App\Support\Repositories\EloquentRepository;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;

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

    public function minimumVersionAfter(int $resourceId, int $sinceVersion): ?int
    {
        $version = $this->query()
            ->where('resource_id', $resourceId)
            ->where('version', '>', $sinceVersion)
            ->min('version');

        if (is_int($version)) {
            return $version;
        }

        if (is_string($version) && preg_match('/^[0-9]+$/', $version) === 1) {
            return (int) $version;
        }

        return null;
    }

    public function after(int $resourceId, int $sinceVersion, ?int $afterId, int $limit): Collection
    {
        $query = $this->query()
            ->where('resource_id', $resourceId)
            ->where('version', '>', $sinceVersion)
            ->orderBy('id');

        if ($afterId !== null) {
            $query->where('id', '>', $afterId);
        }

        /** @var Collection<int, ContentChange> $changes */
        $changes = $query->limit($limit)->get();

        return $changes;
    }

    public function deleteCreatedBefore(CarbonImmutable $before): void
    {
        $this->query()->where('created_at', '<', $before)->delete();
    }

    protected function model(): string
    {
        return ContentChange::class;
    }
}
