<?php

declare(strict_types=1);

namespace App\Domains\Content\Sync\Handlers;

use App\Domains\Content\Data\ContentChangeData;
use App\Domains\Content\Enums\ChangeOperation;
use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Repositories\Contracts\TranslationEntryRepository;
use App\Domains\Content\Sync\GroupHandler;
use App\Domains\Content\Sync\SyncException;
use App\Domains\Content\Sync\TranslationRow;
use App\Integrations\QuranFoundation\CatalogEntry;
use App\Integrations\QuranFoundation\ContentCatalogClient;
use App\Integrations\QuranFoundation\Mutation;
use App\Integrations\QuranFoundation\MutationType;
use App\Integrations\QuranFoundation\Snapshot;

final class TranslationsHandler implements GroupHandler
{
    public function __construct(
        private readonly ContentCatalogClient $catalog,
        private readonly TranslationEntryRepository $entries,
    ) {}

    public function group(): ResourceGroup
    {
        return ResourceGroup::Translations;
    }

    public function usesCatalog(): bool
    {
        return true;
    }

    /**
     * @return list<CatalogEntry>
     */
    public function catalog(): array
    {
        return $this->catalog->translations();
    }

    /**
     * @return int<0, max>
     */
    public function replaceFromSnapshot(Resource $resource, Snapshot $snapshot): int
    {
        $rows = [];

        foreach ($snapshot->records as $record) {
            $rows[] = $this->row($record);
        }

        $this->entries->deleteForResource($resource->id);
        $this->entries->insert($resource->id, $rows);

        return count($rows);
    }

    public function applyRow(Resource $resource, Mutation $mutation): ContentChangeData
    {
        if ($mutation->type === MutationType::RowDelete) {
            return $this->delete($resource, $mutation);
        }

        if ($mutation->type !== MutationType::RowCreate && $mutation->type !== MutationType::RowUpdate) {
            throw new SyncException('Translation sync cannot apply this mutation.');
        }

        if ($mutation->data === null) {
            throw new SyncException('Translation record is missing verse_id or text.');
        }

        $row = $this->row($mutation->data);
        $this->entries->upsert($resource->id, $row);

        return new ContentChangeData(
            entity: 'translation_entry',
            entityKey: (string) $row->verseId,
            op: ChangeOperation::Upsert,
            payload: [
                'resource_id' => $resource->id,
                'verse_id' => $row->verseId,
                'text' => $row->text,
                'footnotes' => $row->footnotes,
            ],
        );
    }

    /**
     * @param  array<string, mixed>  $record
     */
    private function row(array $record): TranslationRow
    {
        if (! array_key_exists('verse_id', $record) || ! is_int($record['verse_id']) || ! array_key_exists('text', $record) || ! is_string($record['text'])) {
            throw new SyncException('Translation record is missing verse_id or text.');
        }

        if (! array_key_exists('verse_key', $record) || ! is_string($record['verse_key'])) {
            throw new SyncException('Translation record is missing verse_key.');
        }

        return new TranslationRow(
            verseId: $record['verse_id'],
            verseKey: $record['verse_key'],
            text: $record['text'],
            footnotes: $this->footnotes($record),
            sourceRecordId: $this->sourceRecordId($record),
        );
    }

    private function delete(Resource $resource, Mutation $mutation): ContentChangeData
    {
        $entry = null;

        if ($this->numericKey($mutation->recordKey)) {
            $entry = $this->entries->findByVerse($resource->id, (int) $mutation->recordKey);
        } elseif ($this->numericKey($mutation->sourceRecordId)) {
            $entry = $this->entries->findBySourceRecord($resource->id, (int) $mutation->sourceRecordId);
        }

        if ($entry === null) {
            throw new SyncException('Translation delete does not identify a row.');
        }

        $verseId = $entry->verse_id;
        $this->entries->delete($resource->id, $verseId);

        return new ContentChangeData(
            entity: 'translation_entry',
            entityKey: (string) $verseId,
            op: ChangeOperation::Delete,
            payload: null,
        );
    }

    /**
     * @param  array<string, mixed>  $record
     * @return array<mixed>|null
     */
    private function footnotes(array $record): ?array
    {
        if (! array_key_exists('foot_notes', $record) || $record['foot_notes'] === null || $record['foot_notes'] === []) {
            return null;
        }

        if (! is_array($record['foot_notes'])) {
            throw new SyncException('Translation record foot_notes must be a list.');
        }

        return $record['foot_notes'];
    }

    /**
     * @param  array<string, mixed>  $record
     */
    private function sourceRecordId(array $record): ?int
    {
        if (! array_key_exists('id', $record) || $record['id'] === null) {
            return null;
        }

        if (! is_int($record['id'])) {
            throw new SyncException('Translation record id must be an integer.');
        }

        return $record['id'];
    }

    private function numericKey(?string $value): bool
    {
        return $value !== null && preg_match('/^[0-9]+$/', $value) === 1;
    }
}
