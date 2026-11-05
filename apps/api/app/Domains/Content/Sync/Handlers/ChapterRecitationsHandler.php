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
use App\Domains\Content\Repositories\Contracts\TaybahTimingRepository;
use App\Domains\Content\Services\RecitationSegmentsFlagService;
use App\Domains\Content\Sync\GroupHandler;
use App\Domains\Content\Sync\ReadsSyncRecords;
use App\Domains\Content\Sync\SyncException;
use App\Integrations\QuranFoundation\CatalogEntry;
use App\Integrations\QuranFoundation\ContentCatalogClient;
use App\Integrations\QuranFoundation\Mutation;
use App\Integrations\QuranFoundation\MutationType;
use App\Integrations\QuranFoundation\ReciterCatalogEntry;
use App\Integrations\QuranFoundation\Snapshot;
use Illuminate\Support\Facades\Log;

final class ChapterRecitationsHandler implements GroupHandler
{
    use ReadsSyncRecords;

    public function __construct(
        private readonly ContentCatalogClient $catalog,
        private readonly RecitationRepository $recitations,
        private readonly ChapterAudioFileRepository $files,
        private readonly RecitationTimingRepository $timings,
        private readonly TaybahTimingRepository $taybah,
        private readonly RecitationSegmentsFlagService $segmentsFlag,
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
        $skipped = [];
        $untimed = [];
        $untrusted = 0;
        $timings = [];
        $trustsTimings = $this->trustsTimings($resource);

        foreach ($snapshot->records as $record) {
            $type = $this->recordType($record);

            if ($type === 'chapter_audio_file' && $this->isNonSurahFile($record)) {
                $skipped[] = $record;
            } elseif ($type === 'chapter_audio_file') {
                $files[] = $record;
            } elseif ($type === 'audio_segment' && ! $trustsTimings) {
                $untrusted++;
            } elseif ($type === 'audio_segment' && $this->isUntimedSegment($record)) {
                $untimed[] = $record;
            } elseif ($type === 'audio_segment') {
                $timings[] = $this->timingRow($record);
            } else {
                throw new SyncException('Unknown chapter recitation record type ['.$type.'].');
            }
        }

        if ($skipped !== []) {
            Log::warning('Quran Foundation chapter recitation snapshot has audio files that are not surahs; they are skipped.', [
                'resource_id' => $resource->source_key,
                'count' => count($skipped),
                'record_id' => $this->requiredInt($skipped[0], 'id'),
                'file_name' => $this->optionalString($skipped[0], 'file_name'),
            ]);
        }

        if ($untimed !== []) {
            Log::warning('Quran Foundation chapter recitation snapshot has audio segments without a valid timing; they are skipped.', [
                'resource_id' => $resource->source_key,
                'count' => count($untimed),
                'verse_key' => $this->optionalString($untimed[0], 'verse_key'),
            ]);
        }

        if ($untrusted > 0) {
            Log::info('Quran Foundation chapter recitation timings are not trusted for this reciter; they are skipped.', [
                'resource_id' => $resource->source_key,
                'count' => $untrusted,
            ]);
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
        $this->segmentsFlag->refresh($recitation->id);

        return count([...$fileRows, ...$timingRows, $recitation]);
    }

    public function applyRow(Resource $resource, Mutation $mutation): ?ContentChangeData
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

        $recordType = $type ?? $this->recordType($mutation->data);

        if ($this->isSkippedRow($resource, $recordType, $mutation->data)) {
            return $this->skipRow($resource, $mutation, $recordType, $mutation->data);
        }

        return match ($recordType) {
            'chapter_audio_file' => $this->upsertFile($resource, $mutation->data),
            'audio_segment' => $this->upsertTiming($resource, $mutation->data),
            default => throw new SyncException('Unknown chapter recitation record type ['.($type ?? '').'].'),
        };
    }

    /**
     * @param  array<string, mixed>  $record
     */
    private function isSkippedRow(Resource $resource, string $recordType, array $record): bool
    {
        return match ($recordType) {
            'chapter_audio_file' => $this->isNonSurahFile($record),
            'audio_segment' => ! $this->trustsTimings($resource) || $this->isUntimedSegment($record),
            default => false,
        };
    }

    /**
     * A skipped row is logged and not stored. If a stored row exists for it (an update made a valid record skipped),
     * that row is removed through the same removeRow() path as RowDelete. Returns null when nothing changed.
     *
     * @param  array<string, mixed>  $record
     */
    private function skipRow(Resource $resource, Mutation $mutation, string $recordType, array $record): ?ContentChangeData
    {
        Log::warning('Quran Foundation chapter recitation row is not stored; it is skipped.', [
            'resource_id' => $resource->source_key,
            'record_type' => $recordType,
            'record_id' => $mutation->recordKey,
            'verse_key' => $recordType === 'audio_segment' ? $this->optionalString($record, 'verse_key') : null,
        ]);

        if (! $this->rowExists($recordType, $mutation->recordKey)) {
            return null;
        }

        return $this->removeRow($this->requireRecitation($resource), $recordType, $mutation->recordKey);
    }

    private function rowExists(string $recordType, ?string $recordKey): bool
    {
        if ($recordKey === null) {
            return false;
        }

        if ($recordType === 'chapter_audio_file') {
            return preg_match('/^[0-9]+$/', $recordKey) === 1 && $this->files->find((int) $recordKey) !== null;
        }

        if ($recordType === 'audio_segment' && preg_match('/^([0-9]+):([0-9]+)$/', $recordKey, $matches) === 1) {
            return $this->timings->exists((int) $matches[1], (int) $matches[2]);
        }

        return false;
    }

    /**
     * A reciter listed in quran.untrusted_timing_recitations has timings that do not match its audio (ADR 0052). Its
     * timing rows are never stored, so the app plays it without highlight rather than with a wrong one.
     */
    private function trustsTimings(Resource $resource): bool
    {
        $untrusted = config('quran.untrusted_timing_recitations', []);

        return ! (is_array($untrusted) && in_array((int) $resource->source_key, $untrusted, true));
    }

    /**
     * QF sends extra chapter_audio_file records with no chapter and no audio URL (for example a non-surah file). Only a
     * record with neither is skipped; a null chapter_id with an audio URL is still an error.
     *
     * @param  array<string, mixed>  $record
     */
    private function isNonSurahFile(array $record): bool
    {
        return ($record['chapter_id'] ?? null) === null && ($record['audio_url'] ?? null) === null;
    }

    /**
     * QF sends some audio segments with no timing (null, or 0 to 0). They cannot be highlighted, so a segment is
     * skipped when either timestamp is null or missing, or when both are ints and from is not before to. A non-int
     * timestamp is not skipped; timingRow() still rejects it.
     *
     * @param  array<string, mixed>  $record
     */
    private function isUntimedSegment(array $record): bool
    {
        $start = $record['timestamp_from'] ?? null;
        $end = $record['timestamp_to'] ?? null;

        if ($start === null || $end === null) {
            return true;
        }

        return is_int($start) && is_int($end) && $start >= $end;
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
        $this->refreshSegmentsFlag($recitation);

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
     * A QF row for a file that a served Taybah set owns is stored as the fallback but emits no change (ADR 0060 amendment, 5 Nov).
     *
     * @param  array<string, mixed>  $record
     */
    private function upsertTiming(Resource $resource, array $record): ?ContentChangeData
    {
        $recitation = $this->requireRecitation($resource);
        $row = $this->timingRow($record);
        $file = $this->requireFile($recitation, $row['audio_file_id']);
        $this->timings->upsert($row);
        $this->refreshSegmentsFlag($recitation);

        if ($this->taybah->hasServedSet($recitation->id, $file->chapter_id, $file->audio_url)) {
            return null;
        }

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

    /**
     * Null only for an audio_segment delete whose file a served Taybah set owns (ADR 0060 decision 5).
     */
    private function delete(Resource $resource, Mutation $mutation): ?ContentChangeData
    {
        return $this->removeRow($this->requireRecitation($resource), $mutation->recordType, $mutation->recordKey);
    }

    /**
     * Null only for an audio_segment removal whose file a served Taybah set owns (ADR 0060 decision 5).
     */
    private function removeRow(Recitation $recitation, ?string $recordType, ?string $recordKey): ?ContentChangeData
    {
        return match ($recordType) {
            'recitation' => $this->deleteRecitation($recitation, $recordKey),
            'chapter_audio_file' => $this->deleteFile($recitation, $recordKey),
            'audio_segment' => $this->deleteTiming($recitation, $recordKey),
            default => throw new SyncException('Unknown chapter recitation record type ['.($recordType ?? '').'].'),
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

    /**
     * Returns null when a served Taybah set owns the file (ADR 0060 amendment, 5 Nov): the QF row is removed, no change.
     */
    private function deleteTiming(Recitation $recitation, ?string $recordKey): ?ContentChangeData
    {
        if ($recordKey === null || preg_match('/^([0-9]+):([0-9]+)$/', $recordKey, $matches) !== 1) {
            throw new SyncException('Recitation timing delete does not identify a row.');
        }

        $audioFileId = (int) $matches[1];
        $verseId = (int) $matches[2];
        $file = $this->requireFile($recitation, $audioFileId);
        $this->timings->delete($audioFileId, $verseId);
        $this->refreshSegmentsFlag($recitation);

        if ($this->taybah->hasServedSet($recitation->id, $file->chapter_id, $file->audio_url)) {
            return null;
        }

        return new ContentChangeData(
            entity: 'recitation_timing',
            entityKey: $audioFileId.':'.$verseId,
            op: ChangeOperation::Delete,
            payload: null,
        );
    }

    private function refreshSegmentsFlag(Recitation $recitation): void
    {
        $this->segmentsFlag->refresh($recitation->id);
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
