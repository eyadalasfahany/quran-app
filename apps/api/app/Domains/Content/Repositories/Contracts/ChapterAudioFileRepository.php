<?php

declare(strict_types=1);

namespace App\Domains\Content\Repositories\Contracts;

use App\Domains\Content\Models\ChapterAudioFile;

interface ChapterAudioFileRepository
{
    public function deleteForRecitation(int $recitationId): void;

    /**
     * @param  list<array{id: int, recitation_id: int, chapter_id: int, audio_url: string, size_bytes: int|null, duration_ms: int, format: string, first_ayah?: int|null, last_ayah?: int|null}>  $rows
     */
    public function insert(array $rows): void;

    /**
     * @param  array{id: int, recitation_id: int, chapter_id: int, audio_url: string, size_bytes: int|null, duration_ms: int, format: string, first_ayah?: int|null, last_ayah?: int|null}  $row
     */
    public function upsert(array $row): void;

    public function find(int $id): ?ChapterAudioFile;

    /**
     * @return list<int>
     */
    public function idsFor(int $recitationId): array;

    public function delete(int $id): void;

    public function findForRecitationChapter(int $recitationId, int $chapterId): ?ChapterAudioFile;

    /**
     * Deletes the recitation's files whose id is not in $keepIds.
     *
     * @param  list<int>  $keepIds
     * @return int the number of rows deleted
     */
    public function deleteForRecitationExcept(int $recitationId, array $keepIds): int;
}
