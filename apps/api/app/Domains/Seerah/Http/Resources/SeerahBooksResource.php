<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Http\Resources;

use App\Domains\Seerah\Data\SeerahBookData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The book list. The resource is the array of served books; next_cursor is always null, as for the hadith collections.
 *
 * @property list<SeerahBookData> $resource
 */
final class SeerahBooksResource extends JsonResource
{
    public static $wrap = null;

    /**
     * @return array{
     *     data: list<array{
     *         resource_id: int,
     *         slug: string,
     *         title_ar: string,
     *         author_ar: string,
     *         edition_ar: string,
     *         attribution_ar: string,
     *         attribution_en: string,
     *         sections_count: int,
     *         paragraphs_count: int,
     *         places_count: int,
     *         events_count: int,
     *         routes_count: int
     *     }>,
     *     next_cursor: null
     * }
     */
    public function toArray(Request $request): array
    {
        $data = [];

        foreach ($this->resource as $book) {
            $data[] = (new SeerahBookResource($book))->toArray($request);
        }

        return [
            'data' => $data,
            'next_cursor' => null,
        ];
    }
}
