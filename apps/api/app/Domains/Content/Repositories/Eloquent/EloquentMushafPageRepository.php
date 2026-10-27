<?php

declare(strict_types=1);

namespace App\Domains\Content\Repositories\Eloquent;

use App\Domains\Content\Models\MushafPage;
use App\Domains\Content\Repositories\Contracts\MushafPageRepository;
use App\Domains\Content\Sync\SyncException;
use App\Support\Repositories\EloquentRepository;
use JsonException;

/**
 * @extends EloquentRepository<MushafPage>
 */
final class EloquentMushafPageRepository extends EloquentRepository implements MushafPageRepository
{
    private const int CHUNK = 500;

    public function deleteForMushaf(int $mushafId): void
    {
        $this->query()->where('mushaf_id', $mushafId)->delete();
    }

    public function insert(array $rows): void
    {
        foreach (array_chunk($rows, self::CHUNK) as $chunk) {
            $this->query()->insert(array_map($this->encode(...), $chunk));
        }
    }

    public function upsert(array $row): void
    {
        $encoded = $this->encode($row);

        $this->query()->updateOrInsert(
            ['mushaf_id' => $row['mushaf_id'], 'page_number' => $row['page_number']],
            $encoded,
        );
    }

    public function delete(int $mushafId, int $pageNumber): void
    {
        $this->query()
            ->where('mushaf_id', $mushafId)
            ->where('page_number', $pageNumber)
            ->delete();
    }

    protected function model(): string
    {
        return MushafPage::class;
    }

    /**
     * @param  array{mushaf_id: int, page_number: int, first_verse_id: int, last_verse_id: int, first_word_id: int, last_word_id: int, verses_count: int, verse_mapping: array<mixed>}  $row
     * @return array{mushaf_id: int, page_number: int, first_verse_id: int, last_verse_id: int, first_word_id: int, last_word_id: int, verses_count: int, verse_mapping: string}
     */
    private function encode(array $row): array
    {
        try {
            $row['verse_mapping'] = json_encode($row['verse_mapping'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new SyncException('Mushaf page verse mapping could not be encoded.', previous: $exception);
        }

        return $row;
    }
}
