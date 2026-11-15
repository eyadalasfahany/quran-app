<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Http\Resources;

use App\Domains\Seerah\Data\SeerahBookData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property SeerahBookData $resource
 */
final class SeerahBookResource extends JsonResource
{
    public static $wrap = null;

    /**
     * @return array{
     *     resource_id: int,
     *     slug: string,
     *     title_ar: string,
     *     author_ar: string,
     *     edition_ar: string,
     *     attribution_ar: string,
     *     attribution_en: string,
     *     sections_count: int,
     *     paragraphs_count: int,
     *     places_count: int,
     *     events_count: int,
     *     routes_count: int
     * }
     */
    public function toArray(Request $request): array
    {
        return [
            'resource_id' => $this->resource->resourceId,
            'slug' => $this->resource->slug,
            'title_ar' => $this->resource->titleAr,
            'author_ar' => $this->resource->authorAr,
            'edition_ar' => $this->resource->editionAr,
            'attribution_ar' => $this->resource->attributionAr,
            'attribution_en' => $this->resource->attributionEn,
            'sections_count' => $this->resource->sectionsCount,
            'paragraphs_count' => $this->resource->paragraphsCount,
            'places_count' => $this->resource->placesCount,
            'events_count' => $this->resource->eventsCount,
            'routes_count' => $this->resource->routesCount,
        ];
    }
}
