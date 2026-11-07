<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Http\Resources;

use App\Domains\Hadith\Data\HadithBookData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property HadithBookData $resource
 */
final class HadithBookResource extends JsonResource
{
    public static $wrap = null;

    /**
     * @return array{
     *     book_number: string,
     *     title_ar: string|null,
     *     title_en: string|null,
     *     position: int,
     *     hadith_count: int
     * }
     */
    public function toArray(Request $request): array
    {
        return [
            'book_number' => $this->resource->bookNumber,
            'title_ar' => $this->resource->titleAr,
            'title_en' => $this->resource->titleEn,
            'position' => $this->resource->position,
            'hadith_count' => $this->resource->hadithCount,
        ];
    }
}
