<?php

declare(strict_types=1);

namespace App\Domains\Content\Http\Resources;

use App\Domains\Content\Data\ContentChangesPageData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property ContentChangesPageData $resource
 */
final class ContentChangesResource extends JsonResource
{
    public static $wrap = null;

    /**
     * @return array{
     *     data: list<array{
     *         id: int,
     *         version: int,
     *         entity: string,
     *         entity_key: string,
     *         op: string,
     *         payload: array<string, mixed>|null
     *     }>,
     *     next_cursor: string|null
     * }
     */
    public function toArray(Request $request): array
    {
        $data = [];

        foreach ($this->resource->items as $item) {
            $data[] = (new ContentChangeItemResource($item))->toArray($request);
        }

        return [
            'data' => $data,
            'next_cursor' => $this->resource->nextCursor,
        ];
    }

    public function withResponse(Request $request, JsonResponse $response): void
    {
        $response->headers->set('Cache-Control', 'public, max-age=60');
    }
}
