<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Services;

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Packs\ChangeCursor;
use App\Domains\Content\Services\ContentDeliveryService;
use App\Domains\Hadith\Data\HadithBookData;
use App\Domains\Hadith\Data\HadithBooksPageData;
use App\Domains\Hadith\Data\HadithChapterData;
use App\Domains\Hadith\Data\HadithChaptersPageData;
use App\Domains\Hadith\Data\HadithCollectionData;
use App\Domains\Hadith\Data\HadithEntriesPageData;
use App\Domains\Hadith\Data\HadithEntriesQueryData;
use App\Domains\Hadith\Data\HadithEntryData;
use App\Domains\Hadith\Data\HadithEntryDetailData;
use App\Domains\Hadith\Data\HadithGradeData;
use App\Domains\Hadith\Data\HadithPageQueryData;
use App\Domains\Hadith\Exceptions\HadithCollectionUnavailableException;
use App\Domains\Hadith\Models\HadithBook;
use App\Domains\Hadith\Models\HadithChapter;
use App\Domains\Hadith\Models\HadithCollection;
use App\Domains\Hadith\Models\HadithEntry;
use App\Domains\Hadith\Models\HadithGrade;
use App\Domains\Hadith\Repositories\Contracts\HadithCatalogueRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * Read side of the hadith catalogue. A collection is served only when the content manifest lists it (ADR 0076);
 * this service never decides completeness itself.
 */
final class HadithCatalogueService
{
    public function __construct(
        private readonly ContentDeliveryService $delivery,
        private readonly HadithCatalogueRepository $repository,
    ) {}

    /**
     * @return list<HadithCollectionData>
     */
    public function collections(): array
    {
        $collections = $this->repository->collections($this->servedResourceIds())->all();

        /** @var array<string, int> $order */
        $order = array_flip(array_values(array_filter(
            (array) config('hadith.collections', []),
            is_string(...),
        )));

        usort($collections, function (HadithCollection $first, HadithCollection $second) use ($order): int {
            $firstIndex = $order[$first->slug] ?? null;
            $secondIndex = $order[$second->slug] ?? null;

            if ($firstIndex !== null && $secondIndex !== null) {
                return $firstIndex <=> $secondIndex;
            }

            if ($firstIndex !== null) {
                return -1;
            }

            if ($secondIndex !== null) {
                return 1;
            }

            return $first->slug <=> $second->slug;
        });

        return array_map($this->collectionData(...), $collections);
    }

    public function books(string $slug, HadithPageQueryData $query): HadithBooksPageData
    {
        $collection = $this->servedCollection($slug);
        $rows = $this->repository->booksAfter($collection->resource_id, $query->afterPosition, $query->limit + 1);
        [$kept, $hasMore] = $this->splitPage($rows->all(), $query->limit);

        $items = array_map(fn (HadithBook $book): HadithBookData => $this->bookData($book), $kept);

        return new HadithBooksPageData(
            items: $items,
            nextCursor: $this->cursorAfter($kept, $hasMore),
        );
    }

    public function chapters(string $slug, string $bookNumber, HadithPageQueryData $query): HadithChaptersPageData
    {
        $collection = $this->servedCollection($slug);
        $book = $this->requireBook($collection->resource_id, $bookNumber);
        $rows = $this->repository->chaptersAfter($collection->resource_id, $book->id, $query->afterPosition, $query->limit + 1);
        [$kept, $hasMore] = $this->splitPage($rows->all(), $query->limit);

        $items = array_map(fn (HadithChapter $chapter): HadithChapterData => $this->chapterData($chapter), $kept);

        return new HadithChaptersPageData(
            items: $items,
            nextCursor: $this->cursorAfter($kept, $hasMore),
        );
    }

    public function entries(string $slug, string $bookNumber, HadithEntriesQueryData $query): HadithEntriesPageData
    {
        $collection = $this->servedCollection($slug);
        $resourceId = $collection->resource_id;
        $book = $this->requireBook($resourceId, $bookNumber);

        $chapterId = null;

        if ($query->chapterNumber !== null) {
            $chapter = $this->repository->findChapter($resourceId, $book->id, $query->chapterNumber);

            if (! $chapter instanceof HadithChapter) {
                throw new ModelNotFoundException(__('problems.hadith_chapter_not_found'));
            }

            $chapterId = $chapter->id;
        }

        $rows = $this->repository->entriesAfter($resourceId, $book->id, $chapterId, $query->afterPosition, $query->limit + 1);
        [$kept, $hasMore] = $this->splitPage($rows->all(), $query->limit);

        $entryIds = array_map(fn (HadithEntry $entry): int => $entry->id, $kept);
        $chapterNumbers = $this->repository->chapterNumbers($resourceId, $this->chapterIds($kept));
        $grades = $this->gradesByEntry($resourceId, $entryIds);

        $items = [];

        foreach ($kept as $entry) {
            $items[] = $this->entryData($entry, $book->book_number, $this->chapterNumberOf($entry, $chapterNumbers), $grades[$entry->id] ?? null);
        }

        return new HadithEntriesPageData(
            items: $items,
            nextCursor: $this->cursorAfter($kept, $hasMore),
        );
    }

    public function entry(string $slug, string $hadithNumber): HadithEntryDetailData
    {
        $collection = $this->servedCollection($slug);
        $resourceId = $collection->resource_id;

        $entry = $this->repository->findEntryByNumber($resourceId, $hadithNumber);

        if (! $entry instanceof HadithEntry) {
            throw new ModelNotFoundException(__('problems.hadith_not_found'));
        }

        $book = $this->repository->findBookById($resourceId, $entry->book_id);

        if (! $book instanceof HadithBook) {
            throw new ModelNotFoundException(__('problems.hadith_not_found'));
        }

        $chapter = null;

        if ($entry->chapter_id !== null) {
            $chapter = $this->repository->findChapterById($resourceId, $entry->chapter_id);

            if (! $chapter instanceof HadithChapter) {
                throw new ModelNotFoundException(__('problems.hadith_not_found'));
            }
        }

        $grades = $this->gradesByEntry($resourceId, [$entry->id]);

        return new HadithEntryDetailData(
            entry: $this->entryData($entry, $book->book_number, $chapter?->chapter_number, $grades[$entry->id] ?? null),
            collection: $this->collectionData($collection),
            book: $this->bookData($book),
            chapter: $chapter instanceof HadithChapter ? $this->chapterData($chapter) : null,
        );
    }

    /**
     * @return list<int>
     */
    private function servedResourceIds(): array
    {
        return $this->delivery->servedResourceIds(ResourceGroup::HadithCollections);
    }

    private function servedCollection(string $slug): HadithCollection
    {
        $collection = $this->repository->findCollection($slug, $this->servedResourceIds());

        if (! $collection instanceof HadithCollection) {
            throw new HadithCollectionUnavailableException;
        }

        return $collection;
    }

    private function requireBook(int $resourceId, string $bookNumber): HadithBook
    {
        $book = $this->repository->findBook($resourceId, $bookNumber);

        if (! $book instanceof HadithBook) {
            throw new ModelNotFoundException(__('problems.hadith_book_not_found'));
        }

        return $book;
    }

    /**
     * Asks for limit + 1 rows: the extra row only proves that another page exists.
     *
     * @template T of object
     *
     * @param  array<int, T>  $rows
     * @return array{list<T>, bool}
     */
    private function splitPage(array $rows, int $limit): array
    {
        $hasMore = count($rows) > $limit;

        return [array_slice($rows, 0, $limit), $hasMore];
    }

    /**
     * @param  list<HadithBook|HadithChapter|HadithEntry>  $kept
     */
    private function cursorAfter(array $kept, bool $hasMore): ?string
    {
        $last = $kept === [] ? null : $kept[array_key_last($kept)];

        if (! $hasMore || $last === null) {
            return null;
        }

        return ChangeCursor::encode($last->position);
    }

    /**
     * @param  list<HadithEntry>  $entries
     * @return list<int>
     */
    private function chapterIds(array $entries): array
    {
        $ids = [];

        foreach ($entries as $entry) {
            if ($entry->chapter_id !== null) {
                $ids[] = $entry->chapter_id;
            }
        }

        return array_values(array_unique($ids));
    }

    /**
     * @param  array<int, int>  $chapterNumbers
     */
    private function chapterNumberOf(HadithEntry $entry, array $chapterNumbers): ?int
    {
        if ($entry->chapter_id === null) {
            return null;
        }

        return $chapterNumbers[$entry->chapter_id] ?? null;
    }

    /**
     * Grades are read only when grades_visible is true (ADR 0042 section 5). Rows with no grader are dropped.
     *
     * @param  list<int>  $entryIds
     * @return array<int, list<HadithGradeData>>
     */
    private function gradesByEntry(int $resourceId, array $entryIds): array
    {
        if (config('hadith.grades_visible') !== true || $entryIds === []) {
            return [];
        }

        $grouped = [];

        foreach ($entryIds as $entryId) {
            $grouped[$entryId] = [];
        }

        /** @var Collection<int, HadithGrade> $grades */
        $grades = $this->repository->gradesForEntries($resourceId, $entryIds);

        foreach ($grades as $grade) {
            $gradedBy = $grade->graded_by;

            if ($gradedBy === null || $gradedBy === '') {
                continue;
            }

            $grouped[$grade->entry_id][] = new HadithGradeData(grade: $grade->grade, gradedBy: $gradedBy);
        }

        return $grouped;
    }

    /**
     * @param  list<HadithGradeData>|null  $grades
     */
    private function entryData(HadithEntry $entry, string $bookNumber, ?int $chapterNumber, ?array $grades): HadithEntryData
    {
        return new HadithEntryData(
            hadithNumber: $entry->hadith_number,
            arabicNumber: $entry->arabic_number,
            position: $entry->position,
            textAr: $entry->text_ar,
            sourceUrl: $entry->source_url,
            bookNumber: $bookNumber,
            chapterNumber: $chapterNumber,
            grades: $grades,
        );
    }

    private function collectionData(HadithCollection $collection): HadithCollectionData
    {
        return new HadithCollectionData(
            resourceId: $collection->resource_id,
            slug: $collection->slug,
            titleAr: $collection->title_ar,
            titleEn: $collection->title_en,
            authorAr: $collection->author_ar,
            authorEn: $collection->author_en,
            attributionAr: $collection->attribution_ar,
            attributionEn: $collection->attribution_en,
            sourceUrl: $collection->source_url,
            totalHadith: $collection->total_hadith,
            booksCount: $collection->books_count,
        );
    }

    private function bookData(HadithBook $book): HadithBookData
    {
        return new HadithBookData(
            bookNumber: $book->book_number,
            titleAr: $book->title_ar,
            titleEn: $book->title_en,
            position: $book->position,
            hadithCount: $book->hadith_count,
        );
    }

    private function chapterData(HadithChapter $chapter): HadithChapterData
    {
        return new HadithChapterData(
            chapterNumber: $chapter->chapter_number,
            titleAr: $chapter->title_ar,
            titleEn: $chapter->title_en,
            position: $chapter->position,
            hadithCount: $chapter->hadith_count,
        );
    }
}
