<?php

declare(strict_types=1);

namespace App\Domains\Content\Repositories\Eloquent;

use App\Domains\Content\Models\RecitationTiming;
use App\Domains\Content\Repositories\Contracts\RecitationTimingRepository;
use App\Domains\Content\Sync\SyncException;
use App\Support\Repositories\EloquentRepository;
use JsonException;

/**
 * @extends EloquentRepository<RecitationTiming>
 */
final class EloquentRecitationTimingRepository extends EloquentRepository implements RecitationTimingRepository
{
    private const int CHUNK = 500;

    public function insert(array $rows): void
    {
        foreach (array_chunk($rows, self::CHUNK) as $chunk) {
            $this->query()->insert(array_map($this->encode(...), $chunk));
        }
    }

    public function upsert(array $row): void
    {
        $this->query()->updateOrInsert(
            ['audio_file_id' => $row['audio_file_id'], 'verse_id' => $row['verse_id']],
            $this->encode($row),
        );
    }

    public function anyHaveSegments(array $audioFileIds): bool
    {
        if ($audioFileIds === []) {
            return false;
        }

        return $this->query()
            ->whereIn('audio_file_id', $audioFileIds)
            ->whereNotNull('segments')
            ->exists();
    }

    public function delete(int $audioFileId, int $verseId): void
    {
        $this->query()
            ->where('audio_file_id', $audioFileId)
            ->where('verse_id', $verseId)
            ->delete();
    }

    protected function model(): string
    {
        return RecitationTiming::class;
    }

    /**
     * @param  array{audio_file_id: int, verse_id: int, verse_key: string, start_ms: int, end_ms: int, segments: list<array{int, int, int}>|null}  $row
     * @return array{audio_file_id: int, verse_id: int, verse_key: string, start_ms: int, end_ms: int, segments: string|null}
     */
    private function encode(array $row): array
    {
        if ($row['segments'] === null) {
            $row['segments'] = null;

            return $row;
        }

        try {
            $row['segments'] = json_encode($row['segments'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new SyncException('Recitation timing segments could not be encoded.', previous: $exception);
        }

        return $row;
    }
}
