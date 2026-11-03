<?php

declare(strict_types=1);

namespace App\Domains\Duas\Repositories\Eloquent;

use App\Domains\Duas\Data\DuasImportPlan;
use App\Domains\Duas\Models\DuaCollectionBook;
use App\Domains\Duas\Models\DuaCollectionRef;
use App\Domains\Duas\Models\DuaGroup;
use App\Domains\Duas\Models\DuaHadith;
use App\Domains\Duas\Models\DuaItem;
use App\Domains\Duas\Models\DuaLink;
use App\Domains\Duas\Models\DuaQuranSpan;
use App\Domains\Duas\Repositories\Contracts\DuasImportRepository;
use Illuminate\Database\Eloquent\Model;

final class EloquentDuasImportRepository implements DuasImportRepository
{
    private const int CHUNK = 500;

    public function replaceForResource(int $resourceId, DuasImportPlan $plan): void
    {
        $this->delete(DuaCollectionBook::class, $resourceId);
        $this->delete(DuaCollectionRef::class, $resourceId);
        $this->delete(DuaLink::class, $resourceId);
        $this->delete(DuaHadith::class, $resourceId);
        $this->delete(DuaQuranSpan::class, $resourceId);
        $this->delete(DuaItem::class, $resourceId);
        $this->delete(DuaGroup::class, $resourceId);

        $this->insert(DuaItem::class, $resourceId, $plan->items);
        $this->insert(DuaQuranSpan::class, $resourceId, $plan->quranSpans);
        $this->insert(DuaGroup::class, $resourceId, $plan->groups);
        $this->insert(DuaHadith::class, $resourceId, $plan->hadith);
        $this->insert(DuaLink::class, $resourceId, $plan->links);
        $this->insert(DuaCollectionRef::class, $resourceId, $plan->collectionRefs);
        $this->insert(DuaCollectionBook::class, $resourceId, $plan->collectionBooks);
    }

    /**
     * @param  class-string<Model>  $model
     */
    private function delete(string $model, int $resourceId): void
    {
        $model::query()->where('resource_id', $resourceId)->delete();
    }

    /**
     * @param  class-string<Model>  $model
     * @param  list<array<string, int|string|null>>  $rows
     */
    private function insert(string $model, int $resourceId, array $rows): void
    {
        foreach (array_chunk($rows, self::CHUNK) as $chunk) {
            $model::query()->insert(array_map(
                static fn (array $row): array => ['resource_id' => $resourceId] + $row,
                $chunk,
            ));
        }
    }
}
