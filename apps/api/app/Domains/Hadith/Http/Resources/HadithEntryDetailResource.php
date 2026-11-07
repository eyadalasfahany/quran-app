<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Http\Resources;

use App\Domains\Hadith\Data\HadithEntryDetailData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One hadith with its breadcrumb (collection, book, chapter) and source credit.
 *
 * @property HadithEntryDetailData $resource
 */
final class HadithEntryDetailResource extends JsonResource
{
    public static $wrap = null;

    /**
     * @return array{
     *     hadith_number: string,
     *     arabic_number: string|null,
     *     position: int,
     *     text_ar: string,
     *     source_url: string|null,
     *     book_number: string,
     *     chapter_number: int|null,
     *     grades?: list<array{grade: string, graded_by: string}>,
     *     collection: array{
     *         resource_id: int,
     *         slug: string,
     *         title_ar: string|null,
     *         title_en: string|null,
     *         author_ar: string|null,
     *         author_en: string|null,
     *         attribution_ar: string,
     *         attribution_en: string,
     *         source_url: string|null,
     *         total_hadith: int,
     *         books_count: int
     *     },
     *     book: array{
     *         book_number: string,
     *         title_ar: string|null,
     *         title_en: string|null,
     *         position: int,
     *         hadith_count: int
     *     },
     *     chapter: array{
     *         chapter_number: int,
     *         title_ar: string|null,
     *         title_en: string|null,
     *         position: int,
     *         hadith_count: int
     *     }|null
     * }
     */
    public function toArray(Request $request): array
    {
        $chapter = $this->resource->chapter;

        return [
            ...(new HadithEntryResource($this->resource->entry))->toArray($request),
            'collection' => (new HadithCollectionResource($this->resource->collection))->toArray($request),
            'book' => (new HadithBookResource($this->resource->book))->toArray($request),
            'chapter' => $chapter === null ? null : (new HadithChapterResource($chapter))->toArray($request),
        ];
    }
}
