<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Http\Resources;

use App\Domains\Hadith\Data\HadithChapterData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property HadithChapterData $resource
 */
final class HadithChapterResource extends JsonResource
{
    public static $wrap = null;

    /**
     * @return array{
     *     chapter_number: int,
     *     title_ar: string|null,
     *     title_en: string|null,
     *     position: int,
     *     hadith_count: int
     * }
     */
    public function toArray(Request $request): array
    {
        return [
            'chapter_number' => $this->resource->chapterNumber,
            'title_ar' => $this->resource->titleAr,
            'title_en' => $this->resource->titleEn,
            'position' => $this->resource->position,
            'hadith_count' => $this->resource->hadithCount,
        ];
    }
}
