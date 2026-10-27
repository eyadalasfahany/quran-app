<?php

declare(strict_types=1);

namespace App\Domains\Content\Repositories\Eloquent;

use App\Domains\Content\Models\TafsirEntry;
use App\Domains\Content\Repositories\Contracts\TafsirEntryRepository;
use App\Support\Repositories\EloquentRepository;

/**
 * @extends EloquentRepository<TafsirEntry>
 */
final class EloquentTafsirEntryRepository extends EloquentRepository implements TafsirEntryRepository
{
    private const int CHUNK = 500;

    public function deleteForResource(int $resourceId): void
    {
        $this->query()->where('resource_id', $resourceId)->delete();
    }

    public function insert(array $rows): void
    {
        foreach (array_chunk($rows, self::CHUNK) as $chunk) {
            $this->query()->insert($chunk);
        }
    }

    public function upsert(array $row): void
    {
        $this->query()->upsert(
            [$row],
            ['resource_id', 'group_tafsir_id'],
            ['first_verse_id', 'last_verse_id', 'first_verse_key', 'last_verse_key', 'html', 'source_hash'],
        );
    }

    public function findByGroup(int $resourceId, int $groupTafsirId): ?TafsirEntry
    {
        return $this->query()
            ->where('resource_id', $resourceId)
            ->where('group_tafsir_id', $groupTafsirId)
            ->first();
    }

    public function deleteByGroup(int $resourceId, int $groupTafsirId): void
    {
        $this->query()
            ->where('resource_id', $resourceId)
            ->where('group_tafsir_id', $groupTafsirId)
            ->delete();
    }

    protected function model(): string
    {
        return TafsirEntry::class;
    }
}
