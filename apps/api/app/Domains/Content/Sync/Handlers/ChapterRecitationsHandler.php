<?php

declare(strict_types=1);

namespace App\Domains\Content\Sync\Handlers;

use App\Domains\Content\Data\ContentChangeData;
use App\Domains\Content\Enums\ChangeOperation;
use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Models\ChapterAudioFile;
use App\Domains\Content\Models\Recitation;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Repositories\Contracts\ChapterAudioFileRepository;
use App\Domains\Content\Repositories\Contracts\RecitationRepository;
use App\Domains\Content\Repositories\Contracts\RecitationTimingRepository;
use App\Domains\Content\Sync\GroupHandler;
use App\Domains\Content\Sync\ReadsSyncRecords;
use App\Domains\Content\Sync\SyncException;
use App\Integrations\QuranFoundation\CatalogEntry;
use App\Integrations\QuranFoundation\ContentCatalogClient;
use App\Integrations\QuranFoundation\Mutation;
use App\Integrations\QuranFoundation\MutationType;
use App\Integrations\QuranFoundation\ReciterCatalogEntry;
use App\Integrations\QuranFoundation\Snapshot;

final class ChapterRecitationsHandler implements GroupHandler
{
    use ReadsSyncRecords;

    public function __construct(
        private readonly ContentCatalogClient $catalog,
        private readonly RecitationRepository $recitations,
        private readonly ChapterAudioFileRepository $files,
        private readonly RecitationTimingRepository $timings,
    ) {}

    public function group(): ResourceGroup
    {
        return ResourceGroup::ChapterRecitations;
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
        $files = [];
        $timings = [];

        foreach ($snapshot->records as $record) {
            $type = $this->recordType($record);

            if ($type === 'chapter_audio_file') {
                $files[] = $record;
            } elseif ($type === 'audio_segment') {
                $timings[] = $this->timingRow($record);
            } else {
                throw new SyncException('Unknown chapter recitation record type ['.$type.'].');
            }
        }

        $names = $this->names($resource, $this->artist($files));
        $resource->name = $names['name'];
        $hasSegments = false;
        $timingRows = [];

        foreach ($timings as $timing) {
            if ($timing['segments'] !== null) {
                $hasSegments = true;
            }

            $timingRows[] = $timing;
        }

        $recitation = $this->recitations->upsertForResource($resource->id, [
            'reciter_name' => $names['name'],
            'reciter_name_ar' => $names['nameAr'],
            'style' => $names['style'],
            'qirat' => $names['qirat'],
            'has_word_segments' => $hasSegments,
        ]);

        $fileRows = [];

        foreach ($files as $record) {
            $fileRows[] = $this->fileRow($recitation, $record);
        }

        $this->files->deleteForRecitation($recitation->id);
        $this->files->insert($fileRows);
        $this->timings->insert($timingRows);

        return count([...$fileRows, ...$timingRows, $recitation]);
    }

    public function applyRow(Resource $resource, Mutation $mutation): ContentChangeData
    {
        if ($mutation->type === MutationType::RowDelete) {
            return $this->delete($resource, $mutation);
        }

        if ($mutation->type !== MutationType::RowCreate && $mutation->type !== MutationType::RowUpdate) {
            throw new SyncException('Chapter recitation sync cannot apply this mutation.');
        }

        $type = $mutation->recordType;

        if ($type === 'recitation') {
            return $this->upsertRecitation($resource, $mutation->data);
        }

        if ($mutation->data === null) {
            throw new SyncException('Chapter recitation record is missing record_type.');
        }

        return match ($type ?? $this->recordType($mutation->data)) {
            'chapter_audio_file' => $this->upsertFile($resource, $mutation->data),
            'audio_segment' => $this->upsertTiming($resource, $mutation->data),
            default => throw new SyncException('Unknown chapter recitation record type ['.($type ?? '').'].'),
        };
    }

    /**
     * @param  list<array<string, mixed>>  $files
     */
    private function artist(array $files): ?string
    {
        foreach ($files as $record) {
            $metadata = $record['metadata'] ?? null;

            if (! is_array($metadata) || array_is_list($metadata)) {
                continue;
            }

            $artist = $metadata['artist'] ?? null;

            if (is_string($artist)) {
                return $artist;
            }
        }

        return null;
    }

    /**
     * @return array{name: string|null, nameAr: string|null, style: string|null, qirat: string|null}
     */
    private function names(Resource $resource, ?string $artist): array
    {
        $sourceId = $this->sourceId($resource);
        $english = $this->reciter($this->catalog->chapterReciters(), $sourceId);
        $nameAr = $this->arabicName($sourceId);

        if ($english === null) {
            return [
                'name' => $artist,
                'nameAr' => $nameAr,
                'style' => null,
                'qirat' => null,
            ];
        }

        return [
            'name' => $english->name,
            'nameAr' => $nameAr,
            'style' => $english->style,
            'qirat' => $english->qirat,
        ];
    }

    /**
     * A config override wins. Otherwise QF's Arabic name is used only when it has an Arabic letter,
     * so a Latin transliteration never reaches the Arabic UI.
     */
    private function arabicName(int $sourceId): ?string
    {
        $overrides = config('quran.reciter_display_names.ar', []);
        $override = is_array($overrides) ? ($overrides[$sourceId] ?? null) : null;

        if (is_string($override)) {
            return $override;
        }

        $arabic = $this->reciter($this->catalog->chapterReciters('ar'), $sourceId)?->translatedName;

        if ($arabic === null || preg_match('/\p{Arabic}/u', $arabic) !== 1) {
            return null;
        }

        return $arabic;
    }

    /**
     * @param  list<ReciterCatalogEntry>  $reciters
     */
    private function reciter(array $reciters, int $sourceId): ?ReciterCatalogEntry
    {
        foreach ($reciters as $reciter) {
            if ($reciter->id === $sourceId) {
                return $reciter;
            }
        }

        return null;
    }

    private function sourceId(Resource $resource): int
    {
        if (preg_match('/^[0-9]+$/', $resource->source_key) !== 1) {
            throw new SyncException('Chapter recitation resource key is invalid.');
        }

        return (int) $resource->source_key;
    }

    /**
     * @param  array<string, mixed>  $record
     * @return array{id: int, recitation_id: int, chapter_id: int, audio_url: string, size_bytes: int|null, duration_ms: int, format: string}
     */
    private function fileRow(Recitation $recitation, array $record): array
    {
        return [
            'id' => $this->requiredInt($record, 'id'),
            'recitation_id' => $recitation->id,
            'chapter_id' => $this->requiredInt($record, 'chapter_id'),
            'audio_url' => $this->requiredString($record, 'audio_url'),
            'size_bytes' => $this->fileSize($record),
            'duration_ms' => $this->durationMs($record),
            'format' => $this->requiredString($record, 'format'),
        ];
    }

    /**
     * @param  array<string, mixed>  $record
     * @return array{audio_file_id: int, verse_id: int, verse_key: string, start_ms: int, end_ms: int, segments: list<array{int, int, int}>|null}
     */
    private function timingRow(array $record): array
    {
        $start = $this->requiredInt($record, 'timestamp_from');
        $end = $this->requiredInt($record, 'timestamp_to');

        if ($start >= $end) {
            throw new SyncException('Recitation timing must start before it ends.');
        }

        return [
            'audio_file_id' => $this->requiredInt($record, 'audio_file_id'),
            'verse_id' => $this->requiredInt($record, 'verse_id'),
            'verse_key' => $this->requiredString($record, 'verse_key'),
            'start_ms' => $start,
            'end_ms' => $end,
            'segments' => $this->segments($record['segments'] ?? null),
        ];
    }

    /**
     * @return list<array{int, int, int}>|null
     */
    private function segments(mixed $value): ?array
    {
        if ($value === null) {
            return null;
        }

        if (! is_array($value)) {
            throw new SyncException('Audio segment field [segments] must be a list.');
        }

        $normalized = [];

        foreach ($value as $entry) {
            $tuple = $this->segment($entry);

            if ($tuple !== null) {
                $normalized[] = $tuple;
            }
        }

        return $normalized === [] ? null : $normalized;
    }

    /**
     * @return array{int, int, int}|null
     */
    private function segment(mixed $entry): ?array
    {
        if (! is_array($entry) || ! array_is_list($entry) || count($entry) !== 3) {
            return null;
        }

        $numbers = [];

        foreach ($entry as $part) {
            if (is_int($part)) {
                $numbers[] = $part;
            } elseif (is_float($part)) {
                $numbers[] = (int) round($part);
            } else {
                return null;
            }
        }

        if ($numbers[1] >= $numbers[2]) {
            return null;
        }

        return [$numbers[0], $numbers[1], $numbers[2]];
    }

    /**
     * @param  array<string, mixed>  $record
     */
    private function fileSize(array $record): ?int
    {
        if (! array_key_exists('file_size', $record) || $record['file_size'] === null) {
            return null;
        }

        $value = $record['file_size'];

        if (is_int($value)) {
            return $value;
        }

        if (is_float($value)) {
            return (int) $value;
        }

        throw new SyncException('Chapter audio file field [file_size] must be a number.');
    }

    /**
     * @param  array<string, mixed>  $record
     */
    private function durationMs(array $record): int
    {
        $fromDuration = $this->requiredInt($record, 'duration') * 1000;
        $given = $this->presentInt($record, 'duration_ms');

        if ($given !== null && $given === $fromDuration) {
            return $given;
        }

        return $fromDuration;
    }

    /**
     * @param  array<string, mixed>|null  $data
     */
    private function upsertRecitation(Resource $resource, ?array $data): ContentChangeData
    {
        $existing = $this->requireRecitation($resource);
        $artist = $data === null ? null : $this->artist([$data]);
        $names = $this->names($resource, $artist);
        $resource->name = $names['name'];

        $recitation = $this->recitations->upsertForResource($resource->id, [
            'reciter_name' => $names['name'],
            'reciter_name_ar' => $names['nameAr'],
            'style' => $names['style'],
            'qirat' => $names['qirat'],
            'has_word_segments' => $existing->has_word_segments,
        ]);

        return $this->recitationChange($recitation, ChangeOperation::Upsert);
    }

    /**
     * @param  array<string, mixed>  $record
     */
    private function upsertFile(Resource $resource, array $record): ContentChangeData
    {
        $recitation = $this->requireRecitation($resource);
        $row = $this->fileRow($recitation, $record);
        $existing = $this->files->find($row['id']);

        if ($existing !== null && $existing->recitation_id !== $recitation->id) {
            throw new SyncException('Chapter audio file does not belong to this resource.');
        }

        $this->files->upsert($row);

        return new ContentChangeData(
            entity: 'chapter_audio_file',
            entityKey: (string) $row['id'],
            op: ChangeOperation::Upsert,
            payload: [
                'id' => $row['id'],
                'recitation_id' => $row['recitation_id'],
                'chapter_id' => $row['chapter_id'],
                'audio_url' => $row['audio_url'],
                'size_bytes' => $row['size_bytes'],
                'duration_ms' => $row['duration_ms'],
                'format' => $row['format'],
            ],
        );
    }

    /**
     * @param  array<string, mixed>  $record
     */
    private function upsertTiming(Resource $resource, array $record): ContentChangeData
    {
        $recitation = $this->requireRecitation($resource);
        $row = $this->timingRow($record);
        $this->requireFile($recitation, $row['audio_file_id']);
        $this->timings->upsert($row);
        $this->refreshSegmentsFlag($recitation);

        return new ContentChangeData(
            entity: 'recitation_timing',
            entityKey: $row['audio_file_id'].':'.$row['verse_id'],
            op: ChangeOperation::Upsert,
            payload: [
                'audio_file_id' => $row['audio_file_id'],
                'verse_id' => $row['verse_id'],
                'start_ms' => $row['start_ms'],
                'end_ms' => $row['end_ms'],
                'segments' => $row['segments'],
            ],
        );
    }

    private function delete(Resource $resource, Mutation $mutation): ContentChangeData
    {
        $recitation = $this->requireRecitation($resource);

        return match ($mutation->recordType) {
            'recitation' => $this->deleteRecitation($recitation, $mutation->recordKey),
            'chapter_audio_file' => $this->deleteFile($recitation, $mutation->recordKey),
            'audio_segment' => $this->deleteTiming($recitation, $mutation->recordKey),
            default => throw new SyncException('Unknown chapter recitation record type ['.($mutation->recordType ?? '').'].'),
        };
    }

    private function deleteRecitation(Recitation $recitation, ?string $recordKey): ContentChangeData
    {
        if ($recordKey !== (string) $recitation->id) {
            throw new SyncException('Recitation delete does not identify a row.');
        }

        $this->recitations->delete($recitation->id);

        return $this->recitationChange($recitation, ChangeOperation::Delete);
    }

    private function deleteFile(Recitation $recitation, ?string $recordKey): ContentChangeData
    {
        $id = $this->numericKey($recordKey, 'Chapter audio file delete does not identify a row.');
        $this->requireFile($recitation, $id);
        $this->files->delete($id);
        $this->refreshSegmentsFlag($recitation);

        return new ContentChangeData(
            entity: 'chapter_audio_file',
            entityKey: (string) $id,
            op: ChangeOperation::Delete,
            payload: null,
        );
    }

    private function deleteTiming(Recitation $recitation, ?string $recordKey): ContentChangeData
    {
        if ($recordKey === null || preg_match('/^([0-9]+):([0-9]+)$/', $recordKey, $matches) !== 1) {
            throw new SyncException('Recitation timing delete does not identify a row.');
        }

        $audioFileId = (int) $matches[1];
        $verseId = (int) $matches[2];
        $this->requireFile($recitation, $audioFileId);
        $this->timings->delete($audioFileId, $verseId);
        $this->refreshSegmentsFlag($recitation);

        return new ContentChangeData(
            entity: 'recitation_timing',
            entityKey: $audioFileId.':'.$verseId,
            op: ChangeOperation::Delete,
            payload: null,
        );
    }

    private function refreshSegmentsFlag(Recitation $recitation): void
    {
        $this->recitations->setHasWordSegments(
            $recitation->id,
            $this->timings->anyHaveSegments($this->files->idsFor($recitation->id)),
        );
    }

    private function requireRecitation(Resource $resource): Recitation
    {
        $recitation = $this->recitations->findForResource($resource->id);

        if ($recitation === null) {
            throw new SyncException('Recitation row does not exist.');
        }

        return $recitation;
    }

    private function requireFile(Recitation $recitation, int $audioFileId): ChapterAudioFile
    {
        $file = $this->files->find($audioFileId);

        if ($file === null || $file->recitation_id !== $recitation->id) {
            throw new SyncException('Chapter audio file does not belong to this resource.');
        }

        return $file;
    }

    private function recitationChange(Recitation $recitation, ChangeOperation $operation): ContentChangeData
    {
        return new ContentChangeData(
            entity: 'recitation',
            entityKey: (string) $recitation->id,
            op: $operation,
            payload: $operation === ChangeOperation::Delete ? null : [
                'id' => $recitation->id,
                'resource_id' => $recitation->resource_id,
                'reciter_name' => $recitation->reciter_name,
                'reciter_name_ar' => $recitation->reciter_name_ar,
                'style' => $recitation->style,
                'qirat' => $recitation->qirat,
                'has_word_segments' => $recitation->has_word_segments,
            ],
        );
    }

    private function numericKey(?string $recordKey, string $message): int
    {
        if ($recordKey === null || preg_match('/^[0-9]+$/', $recordKey) !== 1) {
            throw new SyncException($message);
        }

        return (int) $recordKey;
    }
}
