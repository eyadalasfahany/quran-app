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
        /** @var array<string, int> Emitted items with a count, by the source that gave it (ADR 0031 §6, §12). */
        public array $requiredCountBySource = [],
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
        /** Recordings left out because their file is not in the Taybah audio store (ADR 0040 §2). */
        public int $recordingsMissingFile = 0,
        /** Emitted entries with a reviewed dua type (plan step 3). */
        public int $entryTypesDua = 0,
        /** Emitted entries with a reviewed dhikr type (plan step 3). */
        public int $entryTypesDhikr = 0,
        /** Reviewed duas moved out of Azkar (home 'duas'). */
        public int $homeDuas = 0,
        /** @var array<string, int> Moved duas per browse category id that they belong to. */
        public array $homeDuasByCategory = [],
        /** Reviewed duas that stay whole in a session category. */
        public int $duasKeptInSessions = 0,
        /** Candidate rows in config azkar_entry_types.php, never applied (EntryTypePolicy). */
        public int $candidatesNotApplied = 0,
        /** @var array<string, int> Emitted entries per browse topic id, for topics with at least one entry (ADR 0092). */
        public array $browseEntriesByTopic = [],
        /** Candidate chapter rows in config azkar_topics.php, never applied (TopicPolicy). */
        public int $topicCandidatesNotApplied = 0,
        /** Chapter rows in config azkar_topics.php that are malformed or name an unknown topic or split (TopicPolicy). */
        public int $topicRowsRejected = 0,
    ) {}
}
