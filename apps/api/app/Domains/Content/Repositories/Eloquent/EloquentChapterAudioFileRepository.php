<?php

declare(strict_types=1);

namespace App\Domains\Content\Repositories\Eloquent;

use App\Domains\Content\Models\ChapterAudioFile;
use App\Domains\Content\Repositories\Contracts\ChapterAudioFileRepository;
use App\Support\Repositories\EloquentRepository;

/**
 * @extends EloquentRepository<ChapterAudioFile>
 */
final class EloquentChapterAudioFileRepository extends EloquentRepository implements ChapterAudioFileRepository
{
    private const int CHUNK = 500;

    public function deleteForRecitation(int $recitationId): void
    {
        $this->query()->where('recitation_id', $recitationId)->delete();
    }

    public function insert(array $rows): void
    {
        foreach (array_chunk($rows, self::CHUNK) as $chunk) {
            $this->query()->insert($chunk);
        }
    }

    public function upsert(array $row): void
    {
        $this->query()->updateOrCreate(['id' => $row['id']], $row);
    }

    public function find(int $id): ?ChapterAudioFile
    {
        return $this->query()->find($id);
    }

    public function idsFor(int $recitationId): array
    {
        $ids = [];

        foreach ($this->query()->where('recitation_id', $recitationId)->pluck('id') as $id) {
            if (is_int($id)) {
                $ids[] = $id;
            }
        }

        return $ids;
    }

    public function delete(int $id): void
    {
        $this->query()->whereKey($id)->delete();
    }

    protected function model(): string
    {
        return ChapterAudioFile::class;
    }
}
