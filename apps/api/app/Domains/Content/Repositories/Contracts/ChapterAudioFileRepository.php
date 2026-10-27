<?php

declare(strict_types=1);

namespace App\Domains\Content\Repositories\Contracts;

use App\Domains\Content\Models\ChapterAudioFile;

interface ChapterAudioFileRepository
{
    public function deleteForRecitation(int $recitationId): void;

    /**
     * @param  list<array{id: int, recitation_id: int, chapter_id: int, audio_url: string, size_bytes: int|null, duration_ms: int, format: string}>  $rows
     */
    public function insert(array $rows): void;

    /**
     * @param  array{id: int, recitation_id: int, chapter_id: int, audio_url: string, size_bytes: int|null, duration_ms: int, format: string}  $row
     */
    public function upsert(array $row): void;

    public function find(int $id): ?ChapterAudioFile;

    /**
     * @return list<int>
     */
    public function idsFor(int $recitationId): array;

    public function delete(int $id): void;
}
