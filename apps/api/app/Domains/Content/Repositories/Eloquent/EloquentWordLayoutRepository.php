<?php

declare(strict_types=1);

namespace App\Domains\Content\Repositories\Eloquent;

use App\Domains\Content\Models\WordLayout;
use App\Domains\Content\Repositories\Contracts\WordLayoutRepository;
use App\Support\Repositories\EloquentRepository;

/**
 * @extends EloquentRepository<WordLayout>
 */
final class EloquentWordLayoutRepository extends EloquentRepository implements WordLayoutRepository
{
    private const int CHUNK = 500;

    public function deleteForMushaf(int $mushafId): void
    {
        $this->query()->where('mushaf_id', $mushafId)->delete();
    }

    public function insert(array $rows): void
    {
        foreach (array_chunk($rows, self::CHUNK) as $chunk) {
            $this->query()->insert($chunk);
        }
    }

    public function upsert(array $row): void
    {
        $this->query()->updateOrInsert(
            ['mushaf_id' => $row['mushaf_id'], 'word_id' => $row['word_id']],
            $row,
        );
    }

    public function delete(int $mushafId, int $wordId): void
    {
        $this->query()
            ->where('mushaf_id', $mushafId)
            ->where('word_id', $wordId)
            ->delete();
    }

    public function wordCountsForVerses(int $mushafId, int $firstVerseId, int $lastVerseId): array
    {
        $counts = [];

        $rows = $this->query()
            ->where('mushaf_id', $mushafId)
            ->where('char_type', 'word')
            ->whereBetween('verse_id', [$firstVerseId, $lastVerseId])
            ->groupBy('verse_id')
            ->selectRaw('verse_id, COUNT(*) AS words')
            ->get();

        foreach ($rows as $row) {
            $counts[(int) $row->getAttribute('verse_id')] = (int) $row->getAttribute('words');
        }

        return $counts;
    }

    protected function model(): string
    {
        return WordLayout::class;
    }
}
