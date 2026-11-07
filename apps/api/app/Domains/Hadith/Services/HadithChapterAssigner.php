<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Services;

use App\Domains\Hadith\Exceptions\HadithDataFileException;
use App\Domains\Hadith\Import\Records\HadithImportPlan;
use App\Domains\Hadith\Import\Records\HadithIssue;
use App\Domains\Hadith\Import\Records\MappingResult;
use App\Domains\Hadith\Overlay\ChapterFile;
use App\Domains\Hadith\Overlay\ChapterRecord;

/**
 * Assigns the OpenITI chapters of a collection to the mapped rows (ADR 0076 §2 and §7, step 6b.5). Pure: it returns a new
 * MappingResult. A chapter covers the rows from its first to its last hadith number in position order inside its book, so
 * filled and merge-covering rows between the bounds are included. Chapters never decide completeness.
 */
final class HadithChapterAssigner
{
    /**
     * @throws HadithDataFileException when a chapter names a book that the plan does not have
     */
    public function assign(MappingResult $mapping, ?ChapterFile $file, int $openitiSourceId, string $slug): MappingResult
    {
        if (! $file instanceof ChapterFile) {
            return $mapping;
        }

        $plan = $mapping->plan;
        $entries = $plan->entries;
        $issues = $mapping->issues;

        $bookIds = [];

        foreach ($plan->books as $book) {
            $bookIds[(string) $book['book_number']] = (int) $book['id'];
        }

        $entriesByBook = [];

        foreach ($entries as $index => $entry) {
            $entriesByBook[(int) $entry['book_id']][] = $index;
        }

        foreach ($entriesByBook as $bookId => $indexes) {
            usort($indexes, static fn (int $first, int $second): int => (int) $entries[$first]['position'] <=> (int) $entries[$second]['position']);
            $entriesByBook[$bookId] = $indexes;
        }

        $chapters = [];
        $assigned = [];
        $chapteredBooks = [];
        $firstsByBook = [];
        $chapterId = 0;

        foreach ($file->chapters as $chapter) {
            $bookId = $bookIds[$chapter->bookNumber] ?? null;

            if ($bookId === null) {
                throw new HadithDataFileException('A chapter of ['.$slug.'] names a book that is not in the plan (chapter_book_unknown).');
            }

            $list = $entriesByBook[$bookId] ?? [];
            $firstPosition = $this->positionOf($list, $entries, $chapter->first);
            $lastPosition = $this->positionOf($list, $entries, $chapter->last);

            if ($firstPosition === null || $lastPosition === null) {
                $issues[] = new HadithIssue(HadithIssue::SEVERITY_ERROR, 'chapter_bound_missing', $chapter->first);

                continue;
            }

            if ($lastPosition < $firstPosition) {
                $issues[] = new HadithIssue(HadithIssue::SEVERITY_ERROR, 'chapter_range_inverted', $chapter->first);

                continue;
            }

            if (isset($firstsByBook[$chapter->bookNumber][$chapter->first])) {
                $issues[] = new HadithIssue(HadithIssue::SEVERITY_ERROR, 'chapter_first_repeated', $chapter->first);

                continue;
            }

            $firstsByBook[$chapter->bookNumber][$chapter->first] = true;
            $range = array_slice($list, $firstPosition, $lastPosition - $firstPosition + 1);

            if (array_any($range, static fn (int $index): bool => isset($assigned[$index]))) {
                $issues[] = new HadithIssue(HadithIssue::SEVERITY_ERROR, 'chapter_overlap', $chapter->first);

                continue;
            }

            $chapterId++;

            foreach ($range as $index) {
                $entries[$index]['chapter_id'] = $chapterId;
                $assigned[$index] = true;
            }

            $chapters[] = $this->chapterRow($chapterId, $bookId, $chapter, count($range), $openitiSourceId, $slug);
            $chapteredBooks[$chapter->bookNumber] = true;
        }

        if ($file->partialBooks === ChapterFile::PARTIAL_DROP) {
            foreach (array_keys($chapteredBooks) as $bookNumber) {
                foreach ($entriesByBook[$bookIds[(string) $bookNumber]] ?? [] as $index) {
                    if (! isset($assigned[$index])) {
                        $issues[] = new HadithIssue(HadithIssue::SEVERITY_ERROR, 'partial_book_chapters', (string) $bookNumber);

                        break;
                    }
                }
            }
        }

        return new MappingResult(
            plan: new HadithImportPlan($plan->collection, $plan->books, $chapters, $entries, $plan->grades),
            stats: $mapping->stats,
            issues: $issues,
        );
    }

    /**
     * @param  list<int>  $indexes  entry indexes of one book in position order
     * @param  list<array<string, int|string|null>>  $entries
     */
    private function positionOf(array $indexes, array $entries, string $number): ?int
    {
        foreach ($indexes as $position => $index) {
            if ($entries[$index]['hadith_number'] === $number) {
                return $position;
            }
        }

        return null;
    }

    /**
     * @return array<string, int|string|null>
     */
    private function chapterRow(int $chapterId, int $bookId, ChapterRecord $chapter, int $hadithCount, int $openitiSourceId, string $slug): array
    {
        return [
            'id' => $chapterId,
            'book_id' => $bookId,
            'chapter_number' => $chapter->ordinal,
            'source_chapter_key' => (string) $chapter->ordinal,
            'title_ar' => $chapter->titleAr,
            'title_en' => null,
            'position' => $chapter->ordinal,
            'hadith_count' => $hadithCount,
            'source_id' => $openitiSourceId,
            'source_key' => 'openiti:'.$slug.':'.$chapter->bookNumber.':'.$chapter->ordinal,
        ];
    }
}
