<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Http\Resources;

use App\Domains\Hadith\Data\HadithCollectionData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property HadithCollectionData $resource
 */
final class HadithCollectionResource extends JsonResource
{
    public static $wrap = null;

    /**
     * @return array{
     *     resource_id: int,
     *     slug: string,
     *     title_ar: string|null,
     *     title_en: string|null,
     *     author_ar: string|null,
     *     author_en: string|null,
     *     attribution_ar: string,
     *     attribution_en: string,
     *     source_url: string|null,
     *     total_hadith: int,
     *     books_count: int
     * }
     */
    public function toArray(Request $request): array
    {
        return [
            'resource_id' => $this->resource->resourceId,
            'slug' => $this->resource->slug,
            'title_ar' => $this->resource->titleAr,
            'title_en' => $this->resource->titleEn,
            'author_ar' => $this->resource->authorAr,
            'author_en' => $this->resource->authorEn,
            'attribution_ar' => $this->resource->attributionAr,
            'attribution_en' => $this->resource->attributionEn,
            'source_url' => $this->resource->sourceUrl,
            'total_hadith' => $this->resource->totalHadith,
            'books_count' => $this->resource->booksCount,
        ];
    }
}
