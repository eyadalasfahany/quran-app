<?php

declare(strict_types=1);

namespace App\Domains\Content\Services;

use App\Domains\Content\Repositories\Contracts\ChapterAudioFileRepository;
use App\Domains\Content\Repositories\Contracts\RecitationRepository;
use App\Domains\Content\Repositories\Contracts\RecitationTimingRepository;
use App\Domains\Content\Repositories\Contracts\TaybahTimingRepository;

final class RecitationSegmentsFlagService
{
    public function __construct(
        private readonly RecitationRepository $recitations,
        private readonly ChapterAudioFileRepository $files,
        private readonly RecitationTimingRepository $timings,
        private readonly TaybahTimingRepository $taybah,
    ) {}

    /**
     * has_word_segments = QF rows with segments for the recitation's files OR TaybahTimingRepository::anyServedSegments().
     * The one place this rule lives (ADR 0060 decision 6).
     */
    public function refresh(int $recitationId): void
    {
        $hasQfSegments = $this->timings->anyHaveSegments($this->files->idsFor($recitationId));

        $this->recitations->setHasWordSegments(
            $recitationId,
            $hasQfSegments || $this->taybah->anyServedSegments($recitationId),
        );
    }
}
