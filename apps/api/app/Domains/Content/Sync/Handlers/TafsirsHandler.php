<?php

declare(strict_types=1);

namespace App\Domains\Content\Sync\Handlers;

use App\Domains\Content\Data\ContentChangeData;
use App\Domains\Content\Enums\ChangeOperation;
use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Repositories\Contracts\TafsirEntryRepository;
use App\Domains\Content\Sync\GroupHandler;
use App\Domains\Content\Sync\ReadsSyncRecords;
use App\Domains\Content\Sync\SyncException;
use App\Integrations\QuranFoundation\CatalogEntry;
use App\Integrations\QuranFoundation\ContentCatalogClient;
use App\Integrations\QuranFoundation\Mutation;
use App\Integrations\QuranFoundation\MutationType;
use App\Integrations\QuranFoundation\Snapshot;
use App\Support\Html\HtmlSanitizer;

final class TafsirsHandler implements GroupHandler
{
    use ReadsSyncRecords;

    public function __construct(
        private readonly ContentCatalogClient $catalog,
        private readonly TafsirEntryRepository $entries,
        private readonly HtmlSanitizer $sanitizer,
    ) {}

    public function group(): ResourceGroup
    {
        return ResourceGroup::Tafsirs;
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
        return $this->catalog->tafsirs();
    }

    /**
     * @return int<0, max>
     */
    public function replaceFromSnapshot(Resource $resource, Snapshot $snapshot): int
    {
        $rows = [];
        $seen = [];

        foreach ($snapshot->records as $record) {
            $row = $this->row($resource, $record);

            if (isset($seen[$row['group_tafsir_id']])) {
                continue;
            }

            $seen[$row['group_tafsir_id']] = true;
            $rows[] = $row;
        }

        $this->entries->deleteForResource($resource->id);
        $this->entries->insert($rows);

        return count($rows);
    }

    public function applyRow(Resource $resource, Mutation $mutation): ContentChangeData
    {
        if ($mutation->type === MutationType::RowDelete) {
            return $this->delete($resource, $mutation);
        }

        if ($mutation->type !== MutationType::RowCreate && $mutation->type !== MutationType::RowUpdate) {
            throw new SyncException('Tafsir sync cannot apply this mutation.');
        }

        if ($mutation->data === null) {
            throw new SyncException('Tafsir record is missing group_tafsir_id.');
        }

        $row = $this->row($resource, $mutation->data);
        $this->entries->upsert($row);

        return new ContentChangeData(
            entity: 'tafsir_entry',
            entityKey: (string) $row['group_tafsir_id'],
            op: ChangeOperation::Upsert,
            payload: $this->payload($row),
        );
    }

    /**
     * @param  array<string, mixed>  $record
     * @return array{resource_id: int, group_tafsir_id: int, first_verse_id: int, last_verse_id: int, first_verse_key: string, last_verse_key: string, html: string, source_hash: string}
     */
    private function row(Resource $resource, array $record): array
    {
        $text = $this->requiredString($record, 'text');

        return [
            'resource_id' => $resource->id,
            'group_tafsir_id' => $this->requiredInt($record, 'group_tafsir_id'),
            'first_verse_id' => $this->intOr($record, 'start_verse_id', 'verse_id'),
            'last_verse_id' => $this->intOr($record, 'end_verse_id', 'verse_id'),
            'first_verse_key' => $this->stringOr($record, 'group_verse_key_from', 'verse_key'),
            'last_verse_key' => $this->stringOr($record, 'group_verse_key_to', 'verse_key'),
            'html' => $this->sanitizer->sanitize($text),
            'source_hash' => hash('sha256', $text),
        ];
    }

    private function delete(Resource $resource, Mutation $mutation): ContentChangeData
    {
        if ($mutation->recordKey === null || preg_match('/^[0-9]+$/', $mutation->recordKey) !== 1) {
            throw new SyncException('Tafsir delete does not identify a row.');
        }

        $groupTafsirId = (int) $mutation->recordKey;

        if ($this->entries->findByGroup($resource->id, $groupTafsirId) === null) {
            throw new SyncException('Tafsir delete does not identify a row.');
        }

        $this->entries->deleteByGroup($resource->id, $groupTafsirId);

        return new ContentChangeData(
            entity: 'tafsir_entry',
            entityKey: (string) $groupTafsirId,
            op: ChangeOperation::Delete,
            payload: null,
        );
    }

    /**
     * @param  array{resource_id: int, group_tafsir_id: int, first_verse_id: int, last_verse_id: int, first_verse_key: string, last_verse_key: string, html: string, source_hash: string}  $row
     * @return array{resource_id: int, group_tafsir_id: int, first_verse_id: int, last_verse_id: int, html: string}
     */
    private function payload(array $row): array
    {
        return [
            'resource_id' => $row['resource_id'],
            'group_tafsir_id' => $row['group_tafsir_id'],
            'first_verse_id' => $row['first_verse_id'],
            'last_verse_id' => $row['last_verse_id'],
            'html' => $row['html'],
        ];
    }
}
