<?php

declare(strict_types=1);

namespace App\Domains\Content\Repositories\Eloquent;

use App\Domains\Content\Models\TaybahRecitationTiming;
use App\Domains\Content\Models\TaybahTimingSet;
use App\Domains\Content\Repositories\Contracts\TaybahTimingRepository;
use App\Domains\Content\Sync\SyncException;
use App\Support\Repositories\EloquentRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Query\Builder as QueryBuilder;
use JsonException;

/**
 * @extends EloquentRepository<TaybahTimingSet>
 */
final class EloquentTaybahTimingRepository extends EloquentRepository implements TaybahTimingRepository
{
    private const int CHUNK = 500;

    public function findSet(int $recitationId, int $chapterId): ?TaybahTimingSet
    {
        return $this->query()
            ->where('recitation_id', $recitationId)
            ->where('chapter_id', $chapterId)
            ->first();
    }

    public function upsertSet(array $attributes): TaybahTimingSet
    {
        return $this->query()->updateOrCreate(
            [
                'recitation_id' => $attributes['recitation_id'],
                'chapter_id' => $attributes['chapter_id'],
            ],
            $attributes,
        );
    }

    public function deleteRows(int $recitationId, int $chapterId): void
    {
        TaybahRecitationTiming::query()
            ->where('recitation_id', $recitationId)
            ->where('chapter_id', $chapterId)
            ->delete();
    }

    public function insertRows(array $rows): void
    {
        foreach (array_chunk($rows, self::CHUNK) as $chunk) {
            TaybahRecitationTiming::query()->insert(array_map($this->encode(...), $chunk));
        }
    }

    public function hasServedSet(int $recitationId, int $chapterId, string $audioUrl): bool
    {
        return $this->query()
            ->where('recitation_id', $recitationId)
            ->where('chapter_id', $chapterId)
            ->where('audio_url', $audioUrl)
            ->whereExists($this->whereCurrentFile(...))
            ->exists();
    }

    public function anyServedSegments(int $recitationId): bool
    {
        return $this->query()
            ->where('recitation_id', $recitationId)
            ->whereExists($this->whereCurrentFile(...))
            ->whereExists(function (QueryBuilder $query): void {
                $query->from('taybah_recitation_timings')
                    ->whereColumn('taybah_recitation_timings.recitation_id', 'taybah_timing_sets.recitation_id')
                    ->whereColumn('taybah_recitation_timings.chapter_id', 'taybah_timing_sets.chapter_id')
                    ->whereNotNull('taybah_recitation_timings.segments');
            })
            ->exists();
    }

    /**
     * @return Collection<int, TaybahTimingSet>
     */
    public function staleSets(): Collection
    {
        return $this->query()
            ->whereNotExists($this->whereCurrentFile(...))
            ->get();
    }

    protected function model(): string
    {
        return TaybahTimingSet::class;
    }

    /**
     * Correlated to taybah_timing_sets: a chapter_audio_files row with the same recitation, chapter and audio_url.
     */
    private function whereCurrentFile(QueryBuilder $query): void
    {
        $query->from('chapter_audio_files')
            ->whereColumn('chapter_audio_files.recitation_id', 'taybah_timing_sets.recitation_id')
            ->whereColumn('chapter_audio_files.chapter_id', 'taybah_timing_sets.chapter_id')
            ->whereColumn('chapter_audio_files.audio_url', 'taybah_timing_sets.audio_url');
    }

    /**
     * @param  array{recitation_id: int, chapter_id: int, verse_id: int, start_ms: int, end_ms: int, segments: list<array{int, int, int}>|null}  $row
     * @return array{recitation_id: int, chapter_id: int, verse_id: int, start_ms: int, end_ms: int, segments: string|null}
     */
    private function encode(array $row): array
    {
        if ($row['segments'] === null) {
            return [...$row, 'segments' => null];
        }

        try {
            $segments = json_encode($row['segments'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new SyncException('Taybah recitation timing segments could not be encoded.', previous: $exception);
        }

        return [...$row, 'segments' => $segments];
    }
}
