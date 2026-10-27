<?php

declare(strict_types=1);

namespace App\Domains\Content\Sync\Handlers;

use App\Domains\Content\Data\ContentChangeData;
use App\Domains\Content\Enums\ChangeOperation;
use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Models\Mushaf;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Repositories\Contracts\MushafPageRepository;
use App\Domains\Content\Repositories\Contracts\MushafRepository;
use App\Domains\Content\Repositories\Contracts\WordLayoutRepository;
use App\Domains\Content\Sync\GroupHandler;
use App\Domains\Content\Sync\ReadsSyncRecords;
use App\Domains\Content\Sync\SyncException;
use App\Integrations\QuranFoundation\CatalogEntry;
use App\Integrations\QuranFoundation\Mutation;
use App\Integrations\QuranFoundation\MutationType;
use App\Integrations\QuranFoundation\Snapshot;

final class MushafsHandler implements GroupHandler
{
    use ReadsSyncRecords;

    public function __construct(
        private readonly MushafRepository $mushafs,
        private readonly MushafPageRepository $pages,
        private readonly WordLayoutRepository $words,
    ) {}

    public function group(): ResourceGroup
    {
        return ResourceGroup::Mushafs;
    }

    public function usesCatalog(): bool
    {
        return false;
    }

    /**
     * @return list<CatalogEntry>
     */
    public function catalog(): array
    {
        return [];
    }

    /**
     * @return int<0, max>
     */
    public function replaceFromSnapshot(Resource $resource, Snapshot $snapshot): int
    {
        $mushaf = null;
        $pages = [];
        $words = [];

        foreach ($snapshot->records as $record) {
            $type = $this->recordType($record);

            if ($type === 'mushaf') {
                if ($mushaf !== null) {
                    throw new SyncException('Mushaf snapshot has more than one mushaf record.');
                }

                $mushaf = $this->mushafRow($resource, $record);
                $resource->name = $mushaf['name'];
            } elseif ($type === 'mushaf_page') {
                $pages[] = $this->pageRow($record);
            } elseif ($type === 'mushaf_word') {
                $words[] = $this->wordRow($record);
            } else {
                throw new SyncException('Unknown mushaf record type ['.$type.'].');
            }
        }

        if ($mushaf === null) {
            throw new SyncException('Mushaf snapshot is missing a mushaf record.');
        }

        foreach ([...$pages, ...$words] as $child) {
            if ($child['mushaf_id'] !== $mushaf['id']) {
                throw new SyncException('Mushaf snapshot record does not belong to the mushaf.');
            }
        }

        $stored = $this->mushafs->upsert($mushaf);
        $this->pages->deleteForMushaf($stored->id);
        $this->words->deleteForMushaf($stored->id);
        $this->pages->insert($pages);
        $this->words->insert($words);

        return count([$mushaf, ...$pages, ...$words]);
    }

    public function applyRow(Resource $resource, Mutation $mutation): ContentChangeData
    {
        if ($mutation->type === MutationType::RowDelete) {
            return $this->delete($resource, $mutation);
        }

        if ($mutation->type !== MutationType::RowCreate && $mutation->type !== MutationType::RowUpdate) {
            throw new SyncException('Mushaf sync cannot apply this mutation.');
        }

        if ($mutation->data === null) {
            throw new SyncException('Mushaf record is missing record_type.');
        }

        $type = $mutation->recordType ?? $this->recordType($mutation->data);

        return match ($type) {
            'mushaf' => $this->upsertMushaf($resource, $mutation->data),
            'mushaf_page' => $this->upsertPage($resource, $mutation->data),
            'mushaf_word' => $this->upsertWord($resource, $mutation->data),
            default => throw new SyncException('Unknown mushaf record type ['.$type.'].'),
        };
    }

    /**
     * @param  array<string, mixed>  $record
     * @return array{id: int, resource_id: int, name: string, description: string|null, pages_count: int, lines_per_page: int, default_font_name: string|null, mapping_mode: string|null, qirat_name: string|null}
     */
    private function mushafRow(Resource $resource, array $record): array
    {
        return [
            'id' => $this->requiredInt($record, 'id'),
            'resource_id' => $resource->id,
            'name' => $this->requiredString($record, 'name'),
            'description' => $this->optionalString($record, 'description'),
            'pages_count' => $this->requiredInt($record, 'pages_count'),
            'lines_per_page' => $this->requiredInt($record, 'lines_per_page'),
            'default_font_name' => $this->optionalString($record, 'default_font_name'),
            'mapping_mode' => $this->optionalString($record, 'mapping_mode'),
            'qirat_name' => $this->nestedName($record, 'qirat'),
        ];
    }

    /**
     * @param  array<string, mixed>  $record
     * @return array{mushaf_id: int, page_number: int, first_verse_id: int, last_verse_id: int, first_word_id: int, last_word_id: int, verses_count: int, verse_mapping: array<mixed>}
     */
    private function pageRow(array $record): array
    {
        if (! array_key_exists('verse_mapping', $record) || ! is_array($record['verse_mapping'])) {
            throw new SyncException('Sync record is missing verse_mapping.');
        }

        return [
            'mushaf_id' => $this->requiredInt($record, 'mushaf_id'),
            'page_number' => $this->requiredInt($record, 'page_number'),
            'first_verse_id' => $this->requiredInt($record, 'first_verse_id'),
            'last_verse_id' => $this->requiredInt($record, 'last_verse_id'),
            'first_word_id' => $this->requiredInt($record, 'first_word_id'),
            'last_word_id' => $this->requiredInt($record, 'last_word_id'),
            'verses_count' => $this->requiredInt($record, 'verses_count'),
            'verse_mapping' => $record['verse_mapping'],
        ];
    }

    /**
     * @param  array<string, mixed>  $record
     * @return array{mushaf_id: int, word_id: int, verse_id: int, position_in_verse: int, char_type: string, glyph: string, page: int, line: int, position_in_line: int}
     */
    private function wordRow(array $record): array
    {
        return [
            'mushaf_id' => $this->requiredInt($record, 'mushaf_id'),
            'word_id' => $this->requiredInt($record, 'word_id'),
            'verse_id' => $this->requiredInt($record, 'verse_id'),
            'position_in_verse' => $this->requiredInt($record, 'position_in_verse'),
            'char_type' => $this->requiredString($record, 'char_type_name'),
            'glyph' => $this->requiredString($record, 'text'),
            'page' => $this->requiredInt($record, 'page_number'),
            'line' => $this->requiredInt($record, 'line_number'),
            'position_in_line' => $this->requiredInt($record, 'position_in_line'),
        ];
    }

    /**
     * @param  array<string, mixed>  $record
     */
    private function upsertMushaf(Resource $resource, array $record): ContentChangeData
    {
        $row = $this->mushafRow($resource, $record);
        $resource->name = $row['name'];
        $stored = $this->mushafs->upsert($row);

        return new ContentChangeData(
            entity: 'mushaf',
            entityKey: (string) $stored->id,
            op: ChangeOperation::Upsert,
            payload: [
                'id' => $stored->id,
                'resource_id' => $resource->id,
                'name' => $row['name'],
                'pages_count' => $row['pages_count'],
                'lines_per_page' => $row['lines_per_page'],
                'default_font_name' => $row['default_font_name'],
            ],
        );
    }

    /**
     * @param  array<string, mixed>  $record
     */
    private function upsertPage(Resource $resource, array $record): ContentChangeData
    {
        $mushaf = $this->requireMushaf($resource);
        $row = $this->pageRow($record);

        if ($row['mushaf_id'] !== $mushaf->id) {
            throw new SyncException('Mushaf page does not belong to this resource.');
        }

        $this->pages->upsert($row);

        return new ContentChangeData(
            entity: 'mushaf_page',
            entityKey: (string) $row['page_number'],
            op: ChangeOperation::Upsert,
            payload: [
                'mushaf_id' => $row['mushaf_id'],
                'page_number' => $row['page_number'],
                'first_verse_id' => $row['first_verse_id'],
                'last_verse_id' => $row['last_verse_id'],
                'first_word_id' => $row['first_word_id'],
                'last_word_id' => $row['last_word_id'],
                'verse_mapping' => $row['verse_mapping'],
            ],
        );
    }

    /**
     * @param  array<string, mixed>  $record
     */
    private function upsertWord(Resource $resource, array $record): ContentChangeData
    {
        $mushaf = $this->requireMushaf($resource);
        $row = $this->wordRow($record);

        if ($row['mushaf_id'] !== $mushaf->id) {
            throw new SyncException('Mushaf word does not belong to this resource.');
        }

        $this->words->upsert($row);

        return new ContentChangeData(
            entity: 'word_layout',
            entityKey: (string) $row['word_id'],
            op: ChangeOperation::Upsert,
            payload: [
                'mushaf_id' => $row['mushaf_id'],
                'word_id' => $row['word_id'],
                'verse_id' => $row['verse_id'],
                'position_in_verse' => $row['position_in_verse'],
                'char_type' => $row['char_type'],
                'glyph' => $row['glyph'],
                'page' => $row['page'],
                'line' => $row['line'],
                'position_in_line' => $row['position_in_line'],
            ],
        );
    }

    private function delete(Resource $resource, Mutation $mutation): ContentChangeData
    {
        $mushaf = $this->requireMushaf($resource);
        $key = $this->numericRecordKey($mutation->recordKey);

        return match ($mutation->recordType) {
            'mushaf' => $this->deleteMushaf($mushaf, $key),
            'mushaf_page' => $this->deletePage($mushaf, $key),
            'mushaf_word' => $this->deleteWord($mushaf, $key),
            default => throw new SyncException('Unknown mushaf record type ['.($mutation->recordType ?? '').'].'),
        };
    }

    private function deleteMushaf(Mushaf $mushaf, int $key): ContentChangeData
    {
        if ($mushaf->id !== $key) {
            throw new SyncException('Mushaf delete does not identify a row.');
        }

        $this->mushafs->delete($mushaf->id);

        return new ContentChangeData(
            entity: 'mushaf',
            entityKey: (string) $key,
            op: ChangeOperation::Delete,
            payload: null,
        );
    }

    private function deletePage(Mushaf $mushaf, int $key): ContentChangeData
    {
        $this->pages->delete($mushaf->id, $key);

        return new ContentChangeData(
            entity: 'mushaf_page',
            entityKey: (string) $key,
            op: ChangeOperation::Delete,
            payload: null,
        );
    }

    private function deleteWord(Mushaf $mushaf, int $key): ContentChangeData
    {
        $this->words->delete($mushaf->id, $key);

        return new ContentChangeData(
            entity: 'word_layout',
            entityKey: (string) $key,
            op: ChangeOperation::Delete,
            payload: null,
        );
    }

    private function requireMushaf(Resource $resource): Mushaf
    {
        $mushaf = $this->mushafs->findForResource($resource->id);

        if ($mushaf === null) {
            throw new SyncException('Mushaf row does not exist.');
        }

        return $mushaf;
    }

    private function numericRecordKey(?string $recordKey): int
    {
        if ($recordKey === null || preg_match('/^[0-9]+$/', $recordKey) !== 1) {
            throw new SyncException('Mushaf delete does not identify a row.');
        }

        return (int) $recordKey;
    }
}
