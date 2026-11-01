<?php

declare(strict_types=1);

namespace App\Domains\Content\Repositories\Contracts;

interface RecitationTimingRepository
{
    /**
     * @param  list<array{audio_file_id: int, verse_id: int, verse_key: string, start_ms: int, end_ms: int, segments: list<array{int, int, int}>|null}>  $rows
     */
    public function insert(array $rows): void;

    /**
     * @param  array{audio_file_id: int, verse_id: int, verse_key: string, start_ms: int, end_ms: int, segments: list<array{int, int, int}>|null}  $row
     */
    public function upsert(array $row): void;

    /**
     * @param  list<int>  $audioFileIds
     */
    public function anyHaveSegments(array $audioFileIds): bool;

    public function exists(int $audioFileId, int $verseId): bool;

    public function delete(int $audioFileId, int $verseId): void;
}
