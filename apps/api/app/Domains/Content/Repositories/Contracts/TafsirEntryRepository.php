<?php

declare(strict_types=1);

namespace App\Domains\Content\Repositories\Contracts;

use App\Domains\Content\Models\TafsirEntry;

interface TafsirEntryRepository
{
    public function deleteForResource(int $resourceId): void;

    /**
     * @param  list<array{resource_id: int, group_tafsir_id: int, first_verse_id: int, last_verse_id: int, first_verse_key: string, last_verse_key: string, html: string, source_hash: string}>  $rows
     */
    public function insert(array $rows): void;

    /**
     * @param  array{resource_id: int, group_tafsir_id: int, first_verse_id: int, last_verse_id: int, first_verse_key: string, last_verse_key: string, html: string, source_hash: string}  $row
     */
    public function upsert(array $row): void;

    public function findByGroup(int $resourceId, int $groupTafsirId): ?TafsirEntry;

    public function deleteByGroup(int $resourceId, int $groupTafsirId): void;
}
