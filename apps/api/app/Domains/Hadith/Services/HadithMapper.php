<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Services;

use App\Domains\Hadith\Exceptions\HadithRangeCorrectionException;
use App\Domains\Hadith\Import\Records\CollectionStats;
use App\Domains\Hadith\Import\Records\HadithImportPlan;
use App\Domains\Hadith\Import\Records\HadithIssue;
use App\Domains\Hadith\Import\Records\MappingResult;
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
     * not a mismatch, and a hadith outside every range is listed instead of failing the collection.
     */
    public const int VERSION = 2;

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
    ) {}

    /**
     * @throws HadithRangeCorrectionException for a malformed correction or an unknown section
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
    ): MappingResult {
        $slug = $source->slug;
        $issues = [];
        $corrected = $this->corrections->apply($slug, $source->sections);
        $sections = $corrected['sections'];
        $ranges = $this->ranges($sections);
        $exceptions = $this->referenceExceptions($slug);
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

            if ($text === null || $text === '') {
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

            $accepted[] = ['hadith' => $hadith, 'text' => $text, 'normalized' => $normalized, 'section' => $sectionKey];
        }

        $countsBySection = [];

        foreach ($accepted as $row) {
            $countsBySection[$row['section']] = ($countsBySection[$row['section']] ?? 0) + 1;
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
            $books[] = [
                'id' => $id,
                'book_number' => $section->key,
                'title_ar' => $this->titles->sectionTitleAr($slug, $section->key),
                'title_en' => $section->titleEn,
                'position' => $id,
                'hadith_count' => $countsBySection[$section->key],
                'source_id' => $sourceId,
                'source_key' => $sourceCode.':'.$slug.':'.$section->key,
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
            $issues,
        );

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
        );

        return new MappingResult(
            plan: new HadithImportPlan($collection, $books, [], $entries, $grades),
            stats: $stats,
            issues: $issues,
        );
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
     * @param  list<array{hadith: SourceHadith, text: string, normalized: string, section: string}>  $accepted
     * @param  array<string, int>  $bookIds
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
            $entryId = $index + 1;
            $positionInBook[$section] = ($positionInBook[$section] ?? 0) + 1;
            $sourceKey = $sourceCode.':'.$slug.':'.$hadith->number;

            $entries[] = [
                'id' => $entryId,
                'book_id' => $bookIds[$section],
                'chapter_id' => null,
                'hadith_number' => $hadith->number,
                'arabic_number' => $hadith->arabicNumber,
                'position' => $positionInBook[$section],
                'text_ar' => $row['text'],
                'text_en' => null,
                'narrator_en' => null,
                'text_search' => $row['normalized'],
                'source_url' => null,
                'source_id' => $sourceId,
                'source_key' => $sourceKey,
                'source_text_sha256' => hash('sha256', $row['text']),
                'source_version' => $sourceVersion,
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
