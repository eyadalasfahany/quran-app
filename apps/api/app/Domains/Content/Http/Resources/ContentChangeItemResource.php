<?php

declare(strict_types=1);

namespace App\Domains\Content\Http\Resources;

use App\Domains\Content\Data\ContentChangeItemData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property ContentChangeItemData $resource
 */
final class ContentChangeItemResource extends JsonResource
{
    public static $wrap = null;

    /**
     * @return array{
     *     id: int,
     *     version: int,
     *     entity: string,
     *     entity_key: string,
     *     op: string,
     *     payload: array<string, mixed>|null
     * }
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'version' => $this->resource->version,
            'entity' => $this->resource->entity,
            'entity_key' => $this->resource->entityKey,
            'op' => $this->resource->op->value,
            'payload' => $this->resource->payload,
        ];
    }
}
