<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Http\Resources;

use App\Domains\Hadith\Data\HadithCollectionData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The collection list. The resource is the array of served collections; next_cursor is always null.
 *
 * @property list<HadithCollectionData> $resource
 */
final class HadithCollectionsResource extends JsonResource
{
    public static $wrap = null;

    /**
     * @return array{
     *     data: list<array{
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
     *     }>,
     *     next_cursor: null
     * }
     */
    public function toArray(Request $request): array
    {
        $data = [];

        foreach ($this->resource as $collection) {
            $data[] = (new HadithCollectionResource($collection))->toArray($request);
        }

        return [
            'data' => $data,
            'next_cursor' => null,
        ];
    }
}
