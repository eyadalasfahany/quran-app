<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Http\Resources;

use App\Domains\Hadith\Data\HadithBooksPageData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property HadithBooksPageData $resource
 */
final class HadithBooksResource extends JsonResource
{
    public static $wrap = null;

    /**
     * @return array{
     *     data: list<array{
     *         book_number: string,
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

        foreach ($this->resource->items as $book) {
            $data[] = (new HadithBookResource($book))->toArray($request);
        }

        return [
            'data' => $data,
            'next_cursor' => $this->resource->nextCursor,
        ];
    }
}
