<?php

declare(strict_types=1);

namespace App\Domains\Content\Repositories\Contracts;

use App\Domains\Content\Enums\TaybahTimingSource;
use App\Domains\Content\Models\TaybahTimingSet;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;

interface TaybahTimingRepository
{
    public function findSet(int $recitationId, int $chapterId): ?TaybahTimingSet;

    /**
     * @param  array{recitation_id: int, chapter_id: int, audio_url: string, size_bytes: int, sha256: string, measured_duration_ms: int, source: TaybahTimingSource, tool_version: string|null, models: array<string, mixed>|null, original_first_start_ms: int|null, digest: string, imported_at: CarbonImmutable}  $attributes
     */
    public function upsertSet(array $attributes): TaybahTimingSet;

    public function deleteRows(int $recitationId, int $chapterId): void;

    /**
     * @param  list<array{recitation_id: int, chapter_id: int, verse_id: int, start_ms: int, end_ms: int, segments: list<array{int, int, int}>|null}>  $rows
     */
    public function insertRows(array $rows): void;

    /**
     * True when a set exists for the recitation and chapter, its audio_url equals $audioUrl,
     * and a chapter_audio_files row has the same recitation, chapter and audio_url.
     */
    public function hasServedSet(int $recitationId, int $chapterId, string $audioUrl): bool;

    /**
     * True when any set of the recitation matches a current chapter_audio_files row (same recitation,
     * chapter and audio_url) and has at least one Taybah timing row of that chapter with segments not null.
     */
    public function anyServedSegments(int $recitationId): bool;

    /**
     * Sets whose recitation has no chapter_audio_files row with the same chapter and audio_url.
     *
     * @return Collection<int, TaybahTimingSet>
     */
    public function staleSets(): Collection;
}
