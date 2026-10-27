<?php

declare(strict_types=1);

namespace App\Domains\Content\Repositories\Contracts;

use App\Domains\Content\Models\TranslationEntry;
use App\Domains\Content\Sync\TranslationRow;

interface TranslationEntryRepository
{
    public function deleteForResource(int $resourceId): void;

    /**
     * @param  list<TranslationRow>  $rows
     */
    public function insert(int $resourceId, array $rows): void;

    public function upsert(int $resourceId, TranslationRow $row): void;

    public function findByVerse(int $resourceId, int $verseId): ?TranslationEntry;

    public function findBySourceRecord(int $resourceId, int $sourceRecordId): ?TranslationEntry;

    public function delete(int $resourceId, int $verseId): void;
}
