<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Import\Records;

/**
 * Counts and lists for the report. Lists hold hadith numbers, section keys or grader names only, never text or titles.
 */
final readonly class CollectionStats
{
    /**
     * @param  array<string, int>  $graders  graded_by name => grade rows
     * @param  list<string>  $noTextNumbers
     * @param  list<string>  $duplicateNumbers
     * @param  list<string>  $referenceMismatchNumbers
     * @param  list<string>  $referenceExceptionNumbers
     * @param  list<string>  $emptySectionKeys
     * @param  list<string>  $outsideRanges  Text-bearing hadith whose number falls in no section range (skipped).
     * @param  list<string>  $rangeCorrectionsApplied  Section keys whose range a developer-approved correction replaced.
     * @param  list<string>  $mergedNumbers  Numbers resolved by a merge into a neighbour (step 6b.3).
     * @param  list<string>  $filledNumbers  Numbers filled from OpenITI or hadithapi.com (step 6b.4).
     * @param  list<string>  $placedNumbers  Out-of-range numbers placed by a developer decision (step 6b.2).
     * @param  list<string>  $completenessExceptionNumbers  Numbers accepted by hadith.completeness_exceptions.
     * @param  list<string>  $incompleteNumbers  Numbers with no resolution, in file order (ADR 0076 «Rule, 7 Nov 2026»).
     * @param  array<string, string>  $incompleteReasons  Number => reason code for every incomplete number.
     */
    public function __construct(
        public int $hadithInFile = 0,
        public int $imported = 0,
        public int $noText = 0,
        public int $booksCreated = 0,
        public int $sectionsInFile = 0,
        public int $emptySections = 0,
        public int $grades = 0,
        public int $hadithWithGrades = 0,
        public int $gradesWithoutGrader = 0,
        public array $graders = [],
        public int $section0Hadith = 0,
        public bool $section0IsBook = false,
        public int $referenceChecked = 0,
        public int $estimatedRawBytes = 0,
        public ?int $infoHadithCount = null,
        public ?string $infoLastHadithNumber = null,
        public ?int $infoSectionCount = null,
        public ?string $lastHadithNumberInFile = null,
        public array $noTextNumbers = [],
        public array $duplicateNumbers = [],
        public array $referenceMismatchNumbers = [],
        public array $referenceExceptionNumbers = [],
        public array $emptySectionKeys = [],
        public int $referenceMissing = 0,
        public array $outsideRanges = [],
        public array $rangeCorrectionsApplied = [],
        public array $mergedNumbers = [],
        public array $filledNumbers = [],
        public array $placedNumbers = [],
        public array $completenessExceptionNumbers = [],
        public array $incompleteNumbers = [],
        public array $incompleteReasons = [],
        public bool $complete = false,
    ) {}
}
