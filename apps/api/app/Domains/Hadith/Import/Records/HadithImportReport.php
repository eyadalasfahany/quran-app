<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Import\Records;

/**
 * The outcome of one run, one entry per collection in run order. toReport() is JSON-ready and holds counts, keys,
 * numbers and grader names only: no text, no titles, no section names, no grade strings.
 */
final readonly class HadithImportReport
{
    /** Incomplete numbers and reasons printed in the report; the real count is in counts.incomplete. */
    private const int NUMBERS_SHOWN = 100;

    /**
     * @param  list<CollectionImportResult>  $collections
     */
    public function __construct(
        public string $generatedAt,
        public bool $dryRun,
        public bool $verify,
        public int $peakMemoryBytes,
        public array $collections,
    ) {}

    public function succeeded(): bool
    {
        foreach ($this->collections as $collection) {
            if ($collection->failed()) {
                return false;
            }
        }

        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function toReport(): array
    {
        return [
            'generated_at' => $this->generatedAt,
            'dry_run' => $this->dryRun,
            'verify' => $this->verify,
            'peak_memory_bytes' => $this->peakMemoryBytes,
            'succeeded' => $this->succeeded(),
            'collections' => array_map(fn (CollectionImportResult $result): array => $this->collectionReport($result), $this->collections),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function collectionReport(CollectionImportResult $result): array
    {
        $stats = $result->stats ?? new CollectionStats;
        $rawBytes = $stats->estimatedRawBytes;
        $integrity = $result->integrity;
        $complete = $result->complete ?? $stats->complete;
        $incompleteCount = $result->incompleteCount ?? count($stats->incompleteNumbers);

        return [
            'slug' => $result->slug,
            'status' => $result->status,
            'failure' => $result->failure,
            'fingerprint_unchanged' => $result->fingerprintUnchanged,
            'fingerprint' => $result->fingerprint,
            'counts' => [
                'complete' => $complete,
                'incomplete' => $incompleteCount,
                'merged' => count($stats->mergedNumbers),
                'filled' => count($stats->filledNumbers),
                'placed' => count($stats->placedNumbers),
                'hadith_in_file' => $stats->hadithInFile,
                'imported' => $stats->imported,
                'no_text' => $stats->noText,
                'books_created' => $stats->booksCreated,
                'sections_in_file' => $stats->sectionsInFile,
                'empty_sections' => $stats->emptySections,
                'grades' => $stats->grades,
                'hadith_with_grades' => $stats->hadithWithGrades,
                'distinct_graders' => count($stats->graders),
                'grades_without_grader' => $stats->gradesWithoutGrader,
                'section0_hadith' => $stats->section0Hadith,
                'section0_is_book' => $stats->section0IsBook,
                'reference_checked' => $stats->referenceChecked,
                'reference_mismatches' => count($stats->referenceMismatchNumbers),
                'reference_exceptions_used' => count($stats->referenceExceptionNumbers),
                'reference_missing' => $stats->referenceMissing,
                'outside_ranges' => count($stats->outsideRanges),
                'range_corrections_applied' => count($stats->rangeCorrectionsApplied),
                'duplicates' => count($stats->duplicateNumbers),
                'info_hadith_count' => $stats->infoHadithCount,
                'info_last_hadith_number' => $stats->infoLastHadithNumber,
                'info_section_count' => $stats->infoSectionCount,
                'estimated_raw_bytes' => $rawBytes,
                'estimated_gzip_bytes' => intdiv($rawBytes * 10, 35),
            ],
            'lists' => [
                'no_text_numbers' => $stats->noTextNumbers,
                'duplicate_numbers' => $stats->duplicateNumbers,
                'reference_mismatch_numbers' => $stats->referenceMismatchNumbers,
                'reference_exception_numbers' => $stats->referenceExceptionNumbers,
                'empty_section_keys' => $stats->emptySectionKeys,
                'outside_ranges' => $stats->outsideRanges,
                'range_corrections_applied' => $stats->rangeCorrectionsApplied,
                'incomplete_numbers' => array_slice($stats->incompleteNumbers, 0, self::NUMBERS_SHOWN),
                'incomplete_reasons' => array_slice($stats->incompleteReasons, 0, self::NUMBERS_SHOWN, true),
                'merged_numbers' => $stats->mergedNumbers,
                'filled_numbers' => $stats->filledNumbers,
                'placed_numbers' => $stats->placedNumbers,
            ],
            'graders' => $stats->graders === [] ? new \stdClass : $stats->graders,
            'issues' => $this->groupIssues($result->issues),
            'resource' => [
                'id' => $result->resourceId,
                'version_before' => $result->versionBefore,
                'version_after' => $result->versionAfter,
                'pack' => $result->pack,
            ],
            'integrity' => $integrity === null ? null : [
                'expected' => $integrity->expected,
                'stored' => $integrity->stored,
                'stored_hash_mismatches' => $integrity->storedHashMismatches,
                'source_mismatches' => $integrity->sourceMismatches,
                'missing' => $integrity->missing,
                'extra' => $integrity->extra,
                'first_keys' => $integrity->firstKeys,
            ],
        ];
    }

    /**
     * Issues grouped by severity and code: a count and up to 20 subjects.
     *
     * @param  list<HadithIssue>  $issues
     * @return list<array{severity: string, code: string, count: int, first_subjects: list<string>}>
     */
    private function groupIssues(array $issues): array
    {
        $groups = [];

        foreach ($issues as $issue) {
            $key = $issue->severity.'|'.$issue->code;

            if (! isset($groups[$key])) {
                $groups[$key] = ['severity' => $issue->severity, 'code' => $issue->code, 'count' => 0, 'first_subjects' => []];
            }

            $groups[$key]['count']++;

            if ($issue->subject !== null && count($groups[$key]['first_subjects']) < 20) {
                $groups[$key]['first_subjects'][] = $issue->subject;
            }
        }

        return array_values($groups);
    }
}
