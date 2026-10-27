<?php

declare(strict_types=1);

namespace App\Domains\Content\Repositories\Eloquent;

use App\Domains\Content\Models\TranslationEntry;
use App\Domains\Content\Repositories\Contracts\TranslationEntryRepository;
use App\Domains\Content\Sync\SyncException;
use App\Domains\Content\Sync\TranslationRow;
use App\Support\Repositories\EloquentRepository;
use JsonException;

/**
 * @extends EloquentRepository<TranslationEntry>
 */
final class EloquentTranslationEntryRepository extends EloquentRepository implements TranslationEntryRepository
{
    private const int CHUNK = 500;

    public function deleteForResource(int $resourceId): void
    {
        $this->query()->where('resource_id', $resourceId)->delete();
    }

    public function insert(int $resourceId, array $rows): void
    {
        if ($rows === []) {
            return;
        }

        foreach (array_chunk($rows, self::CHUNK) as $chunk) {
            $this->query()->insert($this->records($resourceId, $chunk));
        }
    }

    public function upsert(int $resourceId, TranslationRow $row): void
    {
        $this->query()->upsert(
            $this->records($resourceId, [$row]),
            ['resource_id', 'verse_id'],
            ['verse_key', 'text', 'footnotes', 'source_record_id'],
        );
    }

    public function findByVerse(int $resourceId, int $verseId): ?TranslationEntry
    {
        return $this->query()
            ->where('resource_id', $resourceId)
            ->where('verse_id', $verseId)
            ->first();
    }

    public function findBySourceRecord(int $resourceId, int $sourceRecordId): ?TranslationEntry
    {
        return $this->query()
            ->where('resource_id', $resourceId)
            ->where('source_record_id', $sourceRecordId)
            ->first();
    }

    public function delete(int $resourceId, int $verseId): void
    {
        $this->query()
            ->where('resource_id', $resourceId)
            ->where('verse_id', $verseId)
            ->delete();
    }

    protected function model(): string
    {
        return TranslationEntry::class;
    }

    /**
     * @param  list<TranslationRow>  $rows
     * @return list<array{resource_id: int, verse_id: int, verse_key: string, text: string, footnotes: string|null, source_record_id: int|null}>
     */
    private function records(int $resourceId, array $rows): array
    {
        $records = [];

        foreach ($rows as $row) {
            $records[] = [
                'resource_id' => $resourceId,
                'verse_id' => $row->verseId,
                'verse_key' => $row->verseKey,
                'text' => $row->text,
                'footnotes' => $this->footnotes($row),
                'source_record_id' => $row->sourceRecordId,
            ];
        }

        return $records;
    }

    private function footnotes(TranslationRow $row): ?string
    {
        if ($row->footnotes === null) {
            return null;
        }

        try {
            return json_encode($row->footnotes, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new SyncException('Translation footnotes could not be stored.', previous: $exception);
        }
    }
}
