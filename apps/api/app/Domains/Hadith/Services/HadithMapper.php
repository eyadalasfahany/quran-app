<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Services;

use App\Domains\Hadith\Exceptions\HadithDataFileException;
use App\Domains\Hadith\Exceptions\HadithRangeCorrectionException;
use App\Domains\Hadith\Import\Records\CollectionStats;
use App\Domains\Hadith\Import\Records\HadithImportPlan;
use App\Domains\Hadith\Import\Records\HadithIssue;
use App\Domains\Hadith\Import\Records\MappingResult;
use App\Domains\Hadith\Overlay\GapBook;
use App\Domains\Hadith\Overlay\GapFill;
use App\Domains\Hadith\Overlay\HadithOverlay;
use App\Domains\Hadith\Sources\Records\SourceCollection;
use App\Domains\Hadith\Sources\Records\SourceCollectionInfo;
use App\Domains\Hadith\Sources\Records\SourceHadith;
use App\Domains\Hadith\Sources\Records\SourceSection;
use App\Support\HadithText\HadithSearchTextNormalizer;
use Carbon\CarbonImmutable;
use UnexpectedValueException;

/**
 * Maps one source collection to the rows the importer writes (ADR 0042 §5, step 6). Pure: no database, no HTTP. Hadith text
 * is kept byte for byte; only text_search is derived. Never throws for bad data; it records issues instead.
 */
final class HadithMapper
{
    /**
     * Bump whenever the mapping rules change: the import fingerprint includes it. 2: range corrections, reference.book 0 is
     * not a mismatch, and a hadith outside every range is listed instead of failing the collection. 3: completeness per
     * collection (ADR 0076 «Rule, 7 Nov 2026»), completeness exceptions. 4: placements of out-of-range hadith (ADR 0076 decision 6).
     * 5: merges, with number_first and number_last on the covering row (ADR 0076 decision 2, step 6b.3). 6: fills, extra books
     * and per-row origin (ADR 0076 decision 4 and the gap decisions, step 6b.4). 7: chapters (step 6b.5); the mapper itself
     * does not read them, the assigner does. 8: placeholder rows for numbers unrecoverable from every source (rule amended 7 Nov 2026).
     */
    public const int VERSION = 8;

    private const int GRADE_MAX_BYTES = 120;

    private const int GRADED_BY_MAX_BYTES = 200;

    private const int ROW_OVERHEAD_BYTES = 150;

    /**
     * reference.book with this value means the source gives no in-book reference (7 Nov 2026): never a mismatch.
     */
    private const string NO_REFERENCE_BOOK = '0';

    public function __construct(
        private readonly HadithSearchTextNormalizer $normalizer,
        private readonly HadithTitles $titles,
        private readonly HadithRangeCorrections $corrections,
        private readonly HadithCompletenessExceptions $completeness,
        private readonly HadithPlacements $placements,
    ) {}

    /**
     * @throws HadithRangeCorrectionException for a malformed correction or an unknown section
     * @throws HadithDataFileException when an extra book cannot be placed (the overlay builder normally refuses it first)
     */
    public function map(
        SourceCollection $source,
        ?SourceCollectionInfo $info,
        int $sourceId,
        string $sourceCode,
        string $sourceVersion,
        string $attributionAr,
        string $attributionEn,
        CarbonImmutable $now,
        ?HadithOverlay $overlay = null,
    ): MappingResult {
        $slug = $source->slug;
        $issues = [];
        $corrected = $this->corrections->apply($slug, $source->sections);
        $sections = $this->withExtraBooks($corrected['sections'], $overlay);
        $ranges = $this->ranges($sections);
        $exceptions = $this->referenceExceptions($slug);
        $completenessExceptions = $this->completeness->forSlug($slug);
        $mergeInto = [];

        $merges = $overlay instanceof HadithOverlay ? $overlay->merges : [];

        foreach ($merges as $merged => $covering) {
            $mergeInto[(string) $merged] = (string) $covering;
        }

        $fills = $overlay instanceof HadithOverlay ? $overlay->fills : [];
        $refusedFills = $overlay instanceof HadithOverlay ? $overlay->refusedFills : [];
        $originSourceIds = $overlay instanceof HadithOverlay ? $overlay->originSourceIds : [];
        $originVersions = $overlay instanceof HadithOverlay ? $overlay->originVersions : [];
        $gapBooks = [];

        foreach ($overlay instanceof HadithOverlay ? $overlay->books : [] as $gapBook) {
            if ($gapBook->bookNumber !== null) {
                $gapBooks[$gapBook->bookNumber] = $gapBook;
            }
        }

        $placements = [];

        foreach ($this->placements->forSlug($slug) as $placement) {
            $placements[$placement['number']] = $placement['section'];
        }

        $sectionKeys = array_map(static fn (SourceSection $section): string => $section->key, $sections);
        $placedNumbers = [];
        $unavailable = array_fill_keys(array_map('strval', $overlay instanceof HadithOverlay ? $overlay->unavailable : []), true);
        $unavailableNumbers = [];
        $seen = [];
        $accepted = [];
        $noTextNumbers = [];
        $duplicateNumbers = [];
        $outsideRanges = [];
        $referenceMismatchNumbers = [];
        $referenceExceptionNumbers = [];
        $referenceChecked = 0;
        $referenceMissing = 0;
        $hadithInFile = 0;
        $lastNumber = null;

        foreach ($source->hadiths as $hadith) {
            $hadithInFile++;
            $lastNumber = $hadith->number;
            $number = $hadith->number;
            $text = $hadith->text;
            $fill = null;

            if (($text === null || $text === '') && isset($fills[$number])) {
                $fill = $fills[$number];
                $text = $fill->text;
                $hadith = new SourceHadith($number, $hadith->arabicNumber, $text, [], null, null);
            }

            if (isset($unavailable[$number])) {
                if ($text !== null && $text !== '') {
                    $issues[] = new HadithIssue(HadithIssue::SEVERITY_ERROR, 'unavailable_has_text', $number);

                    continue;
                }

                if (! is_numeric($number)) {
                    $issues[] = new HadithIssue(HadithIssue::SEVERITY_ERROR, 'non_numeric_hadith_number', $number);

                    continue;
                }

                $candidates = $this->sectionsHolding((float) $number, $ranges);

                if (isset($placements[$number])) {
                    $placeholderSection = in_array($placements[$number], $sectionKeys, true) ? $placements[$number] : null;
                } elseif (count($candidates) > 1) {
                    $issues[] = new HadithIssue(HadithIssue::SEVERITY_ERROR, 'ambiguous_range', $number);

                    continue;
                } else {
                    $placeholderSection = $candidates[0] ?? null;
                }

                if ($placeholderSection === null) {
                    $outsideRanges[] = $number;

                    continue;
                }

                $unavailableNumbers[] = $number;
                $accepted[] = ['hadith' => $hadith, 'text' => '', 'normalized' => '', 'section' => $placeholderSection, 'fill' => null, 'unavailable' => true];

                continue;
            }

            if ($text === null || $text === '') {
                if (isset($mergeInto[$number])) {
                    continue;
                }

                $noTextNumbers[] = $number;

                continue;
            }

            try {
                $normalized = $this->normalizer->normalize($text);
            } catch (UnexpectedValueException) {
                $issues[] = new HadithIssue(HadithIssue::SEVERITY_ERROR, 'invalid_utf8', $number);

                continue;
            }

            if ($normalized === '') {
                $noTextNumbers[] = $number;

                continue;
            }

            if (isset($seen[$number])) {
                $duplicateNumbers[] = $number;
                $issues[] = new HadithIssue(HadithIssue::SEVERITY_ERROR, 'duplicate_hadith_number', $number);

                continue;
            }

            $seen[$number] = true;

            if (! is_numeric($number)) {
                $issues[] = new HadithIssue(HadithIssue::SEVERITY_ERROR, 'non_numeric_hadith_number', $number);

                continue;
            }

            $value = (float) $number;
            $candidates = [];

            foreach ($ranges as $range) {
                if ($value >= $range['from'] && $value <= $range['to']) {
                    $candidates[] = $range['key'];
                }
            }

            if (isset($placements[$number])) {
                if ($candidates !== []) {
                    $issues[] = new HadithIssue(HadithIssue::SEVERITY_ERROR, 'placement_in_range', $number);
                } elseif (! in_array($placements[$number], $sectionKeys, true)) {
                    $issues[] = new HadithIssue(HadithIssue::SEVERITY_ERROR, 'placement_unknown_section', $number);

                    continue;
                } else {
                    // Q6 (7 Nov 2026): a placed hadith is exempt from the reference.book check; OpenITI decided its book.
                    $placedNumbers[] = $number;
                    $accepted[] = ['hadith' => $hadith, 'text' => $text, 'normalized' => $normalized, 'section' => $placements[$number], 'fill' => $fill, 'unavailable' => false];

                    continue;
                }
            }

            if ($candidates === []) {
                $outsideRanges[] = $number;

                continue;
            }

            $referenceBook = $hadith->referenceBook;

            if (count($candidates) > 1) {
                $picked = $referenceBook !== null && in_array($referenceBook, $candidates, true) ? $referenceBook : null;

                if ($picked === null) {
                    $issues[] = new HadithIssue(HadithIssue::SEVERITY_ERROR, 'ambiguous_range', $number);

                    continue;
                }

                $sectionKey = $picked;
            } else {
                $sectionKey = $candidates[0];
            }

            if ($referenceBook === self::NO_REFERENCE_BOOK) {
                $referenceMissing++;
            } elseif ($referenceBook !== null) {
                $referenceChecked++;

                if ($referenceBook !== $sectionKey) {
                    if (in_array($number, $exceptions, true)) {
                        $referenceExceptionNumbers[] = $number;
                    } else {
                        $referenceMismatchNumbers[] = $number;
                    }
                }
            }

            $accepted[] = ['hadith' => $hadith, 'text' => $text, 'normalized' => $normalized, 'section' => $sectionKey, 'fill' => $fill, 'unavailable' => false];
        }

        foreach ($refusedFills as $refusedNumber) {
            $issues[] = new HadithIssue(HadithIssue::SEVERITY_WARNING, 'fill_refused_markup', $refusedNumber);
        }

        $countsBySection = [];
        $acceptedSections = [];

        foreach ($accepted as $row) {
            $countsBySection[$row['section']] = ($countsBySection[$row['section']] ?? 0) + 1;
            $acceptedSections[$row['hadith']->number] = $row['section'];
        }

        $spans = $this->spans($mergeInto, $acceptedSections);

        foreach ($mergeInto as $merged => $covering) {
            if (! isset($acceptedSections[$covering])) {
                $issues[] = new HadithIssue(HadithIssue::SEVERITY_ERROR, 'merge_target_missing', (string) $merged);

                continue;
            }

            $mergedSections = isset($placements[(string) $merged]) ? [$placements[(string) $merged]] : $this->sectionsHolding((float) $merged, $ranges);

            if ($mergedSections !== [] && ! in_array($acceptedSections[$covering], $mergedSections, true)) {
                $issues[] = new HadithIssue(HadithIssue::SEVERITY_ERROR, 'merge_range_crosses_book', (string) $merged);
            }
        }

        $books = [];
        $bookIds = [];
        $emptySectionKeys = [];

        foreach ($sections as $section) {
            if (! isset($countsBySection[$section->key])) {
                $emptySectionKeys[] = $section->key;

                continue;
            }

            $id = count($books) + 1;
            $bookIds[$section->key] = $id;
            $gap = $gapBooks[$section->key] ?? null;
            $books[] = [
                'id' => $id,
                'book_number' => $section->key,
                'title_ar' => $gap instanceof GapBook ? $gap->titleAr : $this->titles->sectionTitleAr($slug, $section->key),
                'title_en' => $section->titleEn,
                'position' => $id,
                'hadith_count' => $countsBySection[$section->key],
                'source_id' => $gap instanceof GapBook && isset($originSourceIds[$gap->origin]) ? $originSourceIds[$gap->origin] : $sourceId,
                'source_key' => $gap instanceof GapBook ? $gap->sourceKey : $sourceCode.':'.$slug.':'.$section->key,
            ];
        }

        $section0Hadith = 0;
        $section0IsBook = false;

        foreach ($books as $book) {
            if ((string) $book['book_number'] === '0') {
                $section0IsBook = true;
                $section0Hadith = (int) $book['hadith_count'];
            }
        }

        [$entries, $grades, $gradeStats, $rawBytes] = $this->entriesAndGrades(
            $accepted,
            $bookIds,
            $slug,
            $sourceId,
            $sourceCode,
            $sourceVersion,
            $now,
            $spans,
            $originSourceIds,
            $originVersions,
            $issues,
        );

        $completeness = $this->assessCompleteness($source, $accepted, $noTextNumbers, $outsideRanges, $completenessExceptions, $issues, $mergeInto);

        $filledNumbers = [];

        foreach ($accepted as $row) {
            if ($row['fill'] instanceof GapFill) {
                $filledNumbers[] = $row['hadith']->number;
            }
        }

        $collection = [
            'id' => 1,
            'slug' => $slug,
            'source_id' => $sourceId,
            'source_code' => $sourceCode,
            'title_ar' => $this->titles->collectionTitleAr($slug),
            'title_en' => $source->titleEn,
            'author_ar' => $this->titles->authorAr($slug),
            'author_en' => null,
            'attribution_ar' => $attributionAr,
            'attribution_en' => $attributionEn,
            'source_url' => null,
            'total_hadith' => count($entries),
            'books_count' => count($books),
            'is_complete' => $completeness['complete'] ? 1 : 0,
            'incomplete_count' => count($completeness['incomplete']),
            'unavailable_count' => count($unavailableNumbers),
            'source_version' => $sourceVersion,
            'imported_at' => $now->format('Y-m-d H:i:s.u'),
        ];

        $stats = new CollectionStats(
            hadithInFile: $hadithInFile,
            imported: count($entries),
            noText: count($noTextNumbers),
            booksCreated: count($books),
            sectionsInFile: count($sections),
            emptySections: count($emptySectionKeys),
            grades: count($grades),
            hadithWithGrades: $gradeStats['hadithWithGrades'],
            gradesWithoutGrader: $gradeStats['gradesWithoutGrader'],
            graders: $gradeStats['graders'],
            section0Hadith: $section0Hadith,
            section0IsBook: $section0IsBook,
            referenceChecked: $referenceChecked,
            estimatedRawBytes: $rawBytes,
            infoHadithCount: $info?->hadithCount,
            infoLastHadithNumber: $info?->lastHadithNumber,
            infoSectionCount: $info?->sectionCount,
            lastHadithNumberInFile: $lastNumber,
            noTextNumbers: $noTextNumbers,
            duplicateNumbers: $duplicateNumbers,
            referenceMismatchNumbers: $referenceMismatchNumbers,
            referenceExceptionNumbers: $referenceExceptionNumbers,
            emptySectionKeys: $emptySectionKeys,
            referenceMissing: $referenceMissing,
            outsideRanges: $outsideRanges,
            rangeCorrectionsApplied: $corrected['applied'],
            placedNumbers: $placedNumbers,
            mergedNumbers: $completeness['mergedNumbers'],
            filledNumbers: $filledNumbers,
            completenessExceptionNumbers: $completeness['exceptionNumbers'],
            incompleteNumbers: $completeness['incomplete'],
            incompleteReasons: $completeness['reasons'],
            complete: $completeness['complete'],
            unavailableNumbers: $unavailableNumbers,
        );

        return new MappingResult(
            plan: new HadithImportPlan($collection, $books, [], $entries, $grades),
            stats: $stats,
            issues: $issues,
        );
    }

    /**
     * The sections with the extra books inserted after their section, in file order (ADR 0076 decision 4, step 6b.4).
     *
     * @param  list<SourceSection>  $sections
     * @return list<SourceSection>
     *
     * @throws HadithDataFileException
     */
    private function withExtraBooks(array $sections, ?HadithOverlay $overlay): array
    {
        if (! $overlay instanceof HadithOverlay) {
            return $sections;
        }

        foreach ($overlay->books as $book) {
            if ($book->bookNumber === null) {
                throw new HadithDataFileException('An extra book has no decided book number (book_number_undecided).');
            }

            $position = null;

            foreach ($sections as $index => $section) {
                if ($section->key === $book->afterBook) {
                    $position = $index;
                }
            }

            if ($position === null) {
                throw new HadithDataFileException('An extra book is placed after an unknown section (book_after_unknown).');
            }

            array_splice($sections, $position + 1, 0, [new SourceSection($book->bookNumber, null, $book->first, $book->last, null, null)]);
        }

        return $sections;
    }

    /**
     * Every number of the source's numbering is resolved or listed (ADR 0076 §2.2, step 6b.1). A number is resolved when it is
     * accepted, or when it is a no-text or out-of-range number that a completeness exception accepts. Errors also make the
     * collection incomplete. Lists hold numbers and reason codes only.
     *
     * @param  list<array{hadith: SourceHadith, text: string, normalized: string, section: string, fill: GapFill|null, unavailable: bool}>  $accepted
     * @param  list<string>  $noTextNumbers
     * @param  list<string>  $outsideRanges
     * @param  list<string>  $exceptions
     * @param  list<HadithIssue>  $issues
     * @param  array<string, string>  $mergeInto  merged number => covering number
     * @return array{complete: bool, incomplete: list<string>, reasons: array<string, string>, exceptionNumbers: list<string>, mergedNumbers: list<string>}
     */
    private function assessCompleteness(SourceCollection $source, array $accepted, array $noTextNumbers, array $outsideRanges, array $exceptions, array $issues, array $mergeInto): array
    {
        $acceptedNumbers = [];

        foreach ($accepted as $row) {
            $acceptedNumbers[$row['hadith']->number] = true;
        }

        $incomplete = [];
        $reasons = [];
        $exceptionNumbers = [];
        $mergedResolved = [];

        foreach ($source->hadiths as $hadith) {
            $number = $hadith->number;

            if (isset($acceptedNumbers[$number])) {
                continue;
            }

            if (isset($mergeInto[$number])) {
                if (isset($acceptedNumbers[$mergeInto[$number]])) {
                    $mergedResolved[] = $number;

                    continue;
                }

                $incomplete[] = $number;
                $reasons[$number] = 'merge_target_missing';

                continue;
            }

            if (in_array($number, $noTextNumbers, true)) {
                $reason = 'no_text';
            } elseif (in_array($number, $outsideRanges, true)) {
                $reason = 'outside_range';
            } else {
                continue;
            }

            if (in_array($number, $exceptions, true)) {
                $exceptionNumbers[] = $number;

                continue;
            }

            $incomplete[] = $number;
            $reasons[$number] = $reason;
        }

        $hasError = false;

        foreach ($issues as $issue) {
            if ($issue->severity === HadithIssue::SEVERITY_ERROR) {
                $hasError = true;

                break;
            }
        }

        return [
            'complete' => $incomplete === [] && ! $hasError,
            'incomplete' => $incomplete,
            'reasons' => $reasons,
            'exceptionNumbers' => $exceptionNumbers,
            'mergedNumbers' => $mergedResolved,
        ];
    }

    /**
     * The span of each covering row: its own number and every merged number it covers, lowest and highest as strings (ADR 0076
     * decision 2). Compared as decimals. A covering row without merged numbers has no span.
     *
     * @param  array<string, string>  $mergeInto
     * @param  array<string, string>  $acceptedSections  accepted number => section key
     * @return array<string, array{first: string, last: string}>
     */
    private function spans(array $mergeInto, array $acceptedSections): array
    {
        $covered = [];

        foreach ($mergeInto as $merged => $covering) {
            if (isset($acceptedSections[$covering])) {
                $covered[(string) $covering][] = (string) $merged;
            }
        }

        $spans = [];

        foreach ($covered as $covering => $merged) {
            $numbers = [(string) $covering, ...$merged];
            usort($numbers, static fn (string $a, string $b): int => (float) $a <=> (float) $b);
            $spans[(string) $covering] = ['first' => $numbers[0], 'last' => $numbers[array_key_last($numbers)]];
        }

        return $spans;
    }

    /**
     * The section keys whose numeric range holds the value.
     *
     * @param  list<array{key: string, from: float, to: float}>  $ranges
     * @return list<string>
     */
    private function sectionsHolding(float $value, array $ranges): array
    {
        $keys = [];

        foreach ($ranges as $range) {
            if ($value >= $range['from'] && $value <= $range['to']) {
                $keys[] = $range['key'];
            }
        }

        return $keys;
    }

    /**
     * Sections with a usable numeric range, in file order.
     *
     * @param  list<SourceSection>  $sections
     * @return list<array{key: string, from: float, to: float}>
     */
    private function ranges(array $sections): array
    {
        $ranges = [];

        foreach ($sections as $section) {
            $first = $section->firstHadithNumber;
            $last = $section->lastHadithNumber;

            if ($first === null || $last === null || ! is_numeric($first) || ! is_numeric($last)) {
                continue;
            }

            $ranges[] = ['key' => $section->key, 'from' => (float) $first, 'to' => (float) $last];
        }

        return $ranges;
    }

    /**
     * @return list<string>
     */
    private function referenceExceptions(string $slug): array
    {
        $all = config('hadith.reference_exceptions', []);
        $list = is_array($all) && is_array($all[$slug] ?? null) ? $all[$slug] : [];
        $numbers = [];

        foreach ($list as $number) {
            if (is_string($number) || is_int($number)) {
                $numbers[] = (string) $number;
            }
        }

        return $numbers;
    }

    /**
     * @param  list<array{hadith: SourceHadith, text: string, normalized: string, section: string, fill: GapFill|null, unavailable: bool}>  $accepted
     * @param  array<string, int>  $bookIds
     * @param  array<string, array{first: string, last: string}>  $spans
     * @param  array<string, int>  $originSourceIds
     * @param  array<string, string>  $originVersions
     * @param  list<HadithIssue>  $issues
     * @return array{0: list<array<string, int|string|null>>, 1: list<array<string, int|string|null>>, 2: array{hadithWithGrades: int, gradesWithoutGrader: int, graders: array<string, int>}, 3: int}
     */
    private function entriesAndGrades(
        array $accepted,
        array $bookIds,
        string $slug,
        int $sourceId,
        string $sourceCode,
        string $sourceVersion,
        CarbonImmutable $now,
        array $spans,
        array $originSourceIds,
        array $originVersions,
        array &$issues,
    ): array {
        $entries = [];
        $grades = [];
        $graders = [];
        $gradesWithoutGrader = 0;
        $hadithWithGrades = 0;
        $positionInBook = [];
        $rawBytes = 0;
        $importedAt = $now->format('Y-m-d H:i:s.u');

        foreach ($accepted as $index => $row) {
            $hadith = $row['hadith'];
            $section = $row['section'];
            $fill = $row['fill'];
            $unavailableRow = $row['unavailable'];
            $entryId = $index + 1;
            $positionInBook[$section] = ($positionInBook[$section] ?? 0) + 1;
            $sourceKey = $sourceCode.':'.$slug.':'.$hadith->number;

            $entries[] = [
                'id' => $entryId,
                'book_id' => $bookIds[$section],
                'chapter_id' => null,
                'hadith_number' => $hadith->number,
                'arabic_number' => $hadith->arabicNumber,
                'number_first' => $spans[$hadith->number]['first'] ?? null,
                'number_last' => $spans[$hadith->number]['last'] ?? null,
                'position' => $positionInBook[$section],
                'text_ar' => $row['text'],
                'text_en' => null,
                'narrator_en' => null,
                'text_search' => $row['normalized'],
                'source_url' => null,
                'source_id' => $fill instanceof GapFill ? $originSourceIds[$fill->origin] : $sourceId,
                'source_key' => $unavailableRow ? 'unavailable:'.$slug.':'.$hadith->number : ($fill instanceof GapFill ? $fill->sourceKey : $sourceKey),
                'source_code' => $unavailableRow ? 'unavailable' : ($fill instanceof GapFill ? $fill->origin : null),
                'source_text_sha256' => hash('sha256', $row['text']),
                'source_version' => $fill instanceof GapFill ? $originVersions[$fill->origin] : $sourceVersion,
                'imported_at' => $importedAt,
            ];

            $rawBytes += strlen($row['text']) + strlen($row['normalized']) + self::ROW_OVERHEAD_BYTES;

            if ($hadith->grades !== []) {
                $hadithWithGrades++;
            }

            foreach ($hadith->grades as $gradeIndex => $grade) {
                $gradeNumber = $gradeIndex + 1;

                if (strlen($grade->grade) > self::GRADE_MAX_BYTES) {
                    $issues[] = new HadithIssue(HadithIssue::SEVERITY_ERROR, 'grade_too_long', $hadith->number);
                }

                if ($grade->gradedBy !== null && strlen($grade->gradedBy) > self::GRADED_BY_MAX_BYTES) {
                    $issues[] = new HadithIssue(HadithIssue::SEVERITY_ERROR, 'graded_by_too_long', $hadith->number);
                }

                if ($grade->gradedBy === null) {
                    $gradesWithoutGrader++;
                } else {
                    $graders[$grade->gradedBy] = ($graders[$grade->gradedBy] ?? 0) + 1;
                }

                $grades[] = [
                    'id' => count($grades) + 1,
                    'entry_id' => $entryId,
                    'grade' => $grade->grade,
                    'graded_by' => $grade->gradedBy,
                    'source_id' => $sourceId,
                    'source_key' => $sourceKey.':'.$gradeNumber,
                ];
            }
        }

        return [$entries, $grades, ['hadithWithGrades' => $hadithWithGrades, 'gradesWithoutGrader' => $gradesWithoutGrader, 'graders' => $graders], $rawBytes];
    }
}
