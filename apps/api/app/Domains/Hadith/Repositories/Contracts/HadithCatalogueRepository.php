<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Repositories\Contracts;

use App\Domains\Hadith\Models\HadithBook;
use App\Domains\Hadith\Models\HadithChapter;
use App\Domains\Hadith\Models\HadithCollection;
use App\Domains\Hadith\Models\HadithEntry;
use App\Domains\Hadith\Models\HadithGrade;
use Illuminate\Database\Eloquent\Collection;

/**
 * Read side of the hadith catalogue. Every method scopes by resource_id; composite keys are read with where(), never find().
 */
interface HadithCatalogueRepository
{
    /**
     * @param  list<int>  $resourceIds
     * @return Collection<int, HadithCollection>
     */
    public function collections(array $resourceIds): Collection;

    /**
     * @param  list<int>  $resourceIds
     */
    public function findCollection(string $slug, array $resourceIds): ?HadithCollection;

    /**
     * @return Collection<int, HadithBook>
     */
    public function booksAfter(int $resourceId, ?int $afterPosition, int $limit): Collection;

    public function findBook(int $resourceId, string $bookNumber): ?HadithBook;

    public function findBookById(int $resourceId, int $bookId): ?HadithBook;

    /**
     * @return Collection<int, HadithChapter>
     */
    public function chaptersAfter(int $resourceId, int $bookId, ?int $afterPosition, int $limit): Collection;

    public function findChapter(int $resourceId, int $bookId, int $chapterNumber): ?HadithChapter;

    public function findChapterById(int $resourceId, int $chapterId): ?HadithChapter;

    /**
     * @return Collection<int, HadithEntry>
     */
    public function entriesAfter(int $resourceId, int $bookId, ?int $chapterId, ?int $afterPosition, int $limit): Collection;

    public function findEntryByNumber(int $resourceId, string $hadithNumber): ?HadithEntry;

    /**
     * @param  list<int>  $chapterIds
     * @return array<int, int> chapter id => chapter_number
     */
    public function chapterNumbers(int $resourceId, array $chapterIds): array;

    /**
     * @param  list<int>  $entryIds
     * @return Collection<int, HadithGrade>
     */
    public function gradesForEntries(int $resourceId, array $entryIds): Collection;
}
