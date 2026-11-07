<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Http\Resources;

use App\Domains\Hadith\Data\HadithEntriesPageData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property HadithEntriesPageData $resource
 */
final class HadithEntriesResource extends JsonResource
{
    public static $wrap = null;

    /**
     * @return array{
     *     data: list<array{
     *         hadith_number: string,
     *         arabic_number: string|null,
     *         position: int,
     *         text_ar: string,
     *         source_url: string|null,
     *         book_number: string,
     *         chapter_number: int|null,
     *         number_first: string|null,
     *         number_last: string|null,
     *         source_code: string|null,
     *         grades?: list<array{grade: string, graded_by: string}>
     *     }>,
     *     next_cursor: string|null
     * }
     */
    public function toArray(Request $request): array
    {
        $data = [];

        foreach ($this->resource->items as $entry) {
            $data[] = (new HadithEntryResource($entry))->toArray($request);
        }

        return [
            'data' => $data,
            'next_cursor' => $this->resource->nextCursor,
        ];
    }
}
