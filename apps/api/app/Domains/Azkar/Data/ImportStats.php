<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Data;

use Spatie\LaravelData\Data;

/**
 * Counts for the import report. Every field is a count, never a text.
 */
final class ImportStats extends Data
{
    public function __construct(
        public int $entries = 0,
        public int $entriesBlocked = 0,
        public int $chapters = 0,
        public int $chaptersWithoutArabicTitle = 0,
        public int $itemsRecitation = 0,
        public int $itemsInstruction = 0,
        public int $itemsNarration = 0,
        public int $itemsWithRequiredCount = 0,
        public int $itemsWithoutRequiredCount = 0,
        public int $segmentsText = 0,
        public int $segmentsQuran = 0,
        public int $quranPassagesMapped = 0,
        public int $quranPassagesUnmapped = 0,
        public int $englishStored = 0,
        public int $englishSkipped = 0,
        public int $recordingsUpstream = 0,
        public int $recordingObjects = 0,
        public int $recordingsImported = 0,
        public int $recordingsDownloadable = 0,
    ) {}
}
