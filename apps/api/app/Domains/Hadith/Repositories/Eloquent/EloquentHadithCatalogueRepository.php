<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Repositories\Eloquent;

use App\Domains\Hadith\Models\HadithBook;
use App\Domains\Hadith\Models\HadithChapter;
use App\Domains\Hadith\Models\HadithCollection;
use App\Domains\Hadith\Models\HadithEntry;
use App\Domains\Hadith\Models\HadithGrade;
use App\Domains\Hadith\Repositories\Contracts\HadithCatalogueRepository;
use App\Support\Repositories\EloquentRepository;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

/**
 * @extends EloquentRepository<HadithCollection>
 */
final class EloquentHadithCatalogueRepository extends EloquentRepository implements HadithCatalogueRepository
{
    protected function model(): string
    {
        return HadithCollection::class;
    }

    public function collections(array $resourceIds): Collection
    {
        if ($resourceIds === []) {
            return new Collection;
        }

        /** @var Collection<int, HadithCollection> $collections */
        $collections = $this->query()
            ->whereIn('resource_id', $resourceIds)
            ->orderBy('id')
            ->get();

        return $collections;
    }

    public function findCollection(string $slug, array $resourceIds): ?HadithCollection
    {
        if ($resourceIds === []) {
            return null;
        }

        $collection = $this->query()
            ->where('slug', $slug)
            ->whereIn('resource_id', $resourceIds)
            ->first();

        return $collection instanceof HadithCollection ? $collection : null;
    }

    public function booksAfter(int $resourceId, ?int $afterPosition, int $limit): Collection
    {
        /** @var Builder<HadithBook> $query */
        $query = HadithBook::query()->where('resource_id', $resourceId);

        if ($afterPosition !== null) {
            $query->where('position', '>', $afterPosition);
        }

        /** @var Collection<int, HadithBook> $books */
        $books = $query->orderBy('position')->limit($limit)->get();

        return $books;
    }

    public function findBook(int $resourceId, string $bookNumber): ?HadithBook
    {
        $book = HadithBook::query()
            ->where('resource_id', $resourceId)
            ->where('book_number', $bookNumber)
            ->orderBy('position')
            ->first();

        return $book instanceof HadithBook ? $book : null;
    }

    public function findBookById(int $resourceId, int $bookId): ?HadithBook
    {
        $book = HadithBook::query()
            ->where('resource_id', $resourceId)
            ->where('id', $bookId)
            ->first();

        return $book instanceof HadithBook ? $book : null;
    }

    public function chaptersAfter(int $resourceId, int $bookId, ?int $afterPosition, int $limit): Collection
    {
        /** @var Builder<HadithChapter> $query */
        $query = HadithChapter::query()
            ->where('resource_id', $resourceId)
            ->where('book_id', $bookId);

        if ($afterPosition !== null) {
            $query->where('position', '>', $afterPosition);
        }

        /** @var Collection<int, HadithChapter> $chapters */
        $chapters = $query->orderBy('position')->limit($limit)->get();

        return $chapters;
    }

    public function findChapter(int $resourceId, int $bookId, int $chapterNumber): ?HadithChapter
    {
        $chapter = HadithChapter::query()
            ->where('resource_id', $resourceId)
            ->where('book_id', $bookId)
            ->where('chapter_number', $chapterNumber)
            ->orderBy('position')
            ->first();

        return $chapter instanceof HadithChapter ? $chapter : null;
    }

    public function findChapterById(int $resourceId, int $chapterId): ?HadithChapter
    {
        $chapter = HadithChapter::query()
            ->where('resource_id', $resourceId)
            ->where('id', $chapterId)
            ->first();

        return $chapter instanceof HadithChapter ? $chapter : null;
    }

    public function entriesAfter(int $resourceId, int $bookId, ?int $chapterId, ?int $afterPosition, int $limit): Collection
    {
        /** @var Builder<HadithEntry> $query */
        $query = HadithEntry::query()
            ->where('resource_id', $resourceId)
            ->where('book_id', $bookId);

        if ($chapterId !== null) {
            $query->where('chapter_id', $chapterId);
        }

        if ($afterPosition !== null) {
            $query->where('position', '>', $afterPosition);
        }

        /** @var Collection<int, HadithEntry> $entries */
        $entries = $query->orderBy('position')->limit($limit)->get();

        return $entries;
    }

    /**
     * The exact hadith number first. On a miss, the covering row whose span (ADR 0076 decision 2, step 6b.3) contains the number,
     * compared as decimals. A non-numeric lookup is refused before the cast.
     */
    public function findEntryByNumber(int $resourceId, string $hadithNumber): ?HadithEntry
    {
        $entry = HadithEntry::query()
            ->where('resource_id', $resourceId)
            ->where('hadith_number', $hadithNumber)
            ->orderBy('id')
            ->first();

        if ($entry instanceof HadithEntry) {
            return $entry;
        }

        if (! is_numeric($hadithNumber)) {
            return null;
        }

        $covering = HadithEntry::query()
            ->where('resource_id', $resourceId)
            ->whereNotNull('number_first')
            ->whereNotNull('number_last')
            ->whereRaw('CAST(number_first AS DECIMAL(20,4)) <= ?', [$hadithNumber])
            ->whereRaw('CAST(number_last AS DECIMAL(20,4)) >= ?', [$hadithNumber])
            ->orderBy('id')
            ->first();

        return $covering instanceof HadithEntry ? $covering : null;
    }

    public function chapterNumbers(int $resourceId, array $chapterIds): array
    {
        if ($chapterIds === []) {
            return [];
        }

        $numbers = [];

        foreach (HadithChapter::query()
            ->where('resource_id', $resourceId)
            ->whereIn('id', $chapterIds)
            ->get(['id', 'chapter_number']) as $chapter) {
            $numbers[$chapter->id] = $chapter->chapter_number;
        }

        return $numbers;
    }

    public function gradesForEntries(int $resourceId, array $entryIds): Collection
    {
        if ($entryIds === []) {
            return new Collection;
        }

        /** @var Collection<int, HadithGrade> $grades */
        $grades = HadithGrade::query()
            ->where('resource_id', $resourceId)
            ->whereIn('entry_id', $entryIds)
            ->orderBy('id')
            ->get();

        return $grades;
    }
}
