<?php

declare(strict_types=1);

namespace App\Domains\Content\Repositories\Contracts;

interface WordLayoutRepository
{
    public function deleteForMushaf(int $mushafId): void;

    /**
     * @param  list<array{mushaf_id: int, word_id: int, verse_id: int, position_in_verse: int, char_type: string, glyph: string, page: int, line: int, position_in_line: int}>  $rows
     */
    public function insert(array $rows): void;

    /**
     * @param  array{mushaf_id: int, word_id: int, verse_id: int, position_in_verse: int, char_type: string, glyph: string, page: int, line: int, position_in_line: int}  $row
     */
    public function upsert(array $row): void;

    public function delete(int $mushafId, int $wordId): void;
}
