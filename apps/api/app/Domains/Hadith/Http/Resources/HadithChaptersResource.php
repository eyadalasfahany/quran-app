<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Http\Resources;

use App\Domains\Hadith\Data\HadithChaptersPageData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property HadithChaptersPageData $resource
 */
final class HadithChaptersResource extends JsonResource
{
    public static $wrap = null;

    /**
     * @return array{
     *     data: list<array{
     *         chapter_number: int,
     *         title_ar: string|null,
     *         title_en: string|null,
     *         position: int,
     *         hadith_count: int
     *     }>,
     *     next_cursor: string|null
     * }
     */
    public function toArray(Request $request): array
    {
        $data = [];

        foreach ($this->resource->items as $chapter) {
            $data[] = (new HadithChapterResource($chapter))->toArray($request);
        }

        return [
            'data' => $data,
            'next_cursor' => $this->resource->nextCursor,
        ];
    }
}
