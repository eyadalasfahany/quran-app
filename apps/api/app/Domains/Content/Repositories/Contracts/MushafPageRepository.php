<?php

declare(strict_types=1);

namespace App\Domains\Content\Repositories\Contracts;

interface MushafPageRepository
{
    public function deleteForMushaf(int $mushafId): void;

    /**
     * @param  list<array{mushaf_id: int, page_number: int, first_verse_id: int, last_verse_id: int, first_word_id: int, last_word_id: int, verses_count: int, verse_mapping: array<mixed>}>  $rows
     */
    public function insert(array $rows): void;

    /**
     * @param  array{mushaf_id: int, page_number: int, first_verse_id: int, last_verse_id: int, first_word_id: int, last_word_id: int, verses_count: int, verse_mapping: array<mixed>}  $row
     */
    public function upsert(array $row): void;

    public function delete(int $mushafId, int $pageNumber): void;
}
