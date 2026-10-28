<?php

declare(strict_types=1);

namespace App\Domains\Content\Http\Resources;

use App\Domains\Content\Data\ContentManifestEntryData;
use App\Domains\Content\Enums\ServedResourceGroup;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property ContentManifestEntryData $resource
 */
final class ContentManifestEntryResource extends JsonResource
{
    public static $wrap = null;

    /**
     * @return array{
     *     id: int,
     *     group: ServedResourceGroup,
     *     name: string|null,
     *     author_name: string|null,
     *     language_code: string|null,
     *     direction: string|null,
     *     version: int,
     *     pack: array{url: string, size_bytes: int, sha256: string},
     *     changes_since_min_version: int
     * }
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'group' => ServedResourceGroup::fromResourceGroup($this->resource->group),
            'name' => $this->resource->name,
            'name_ar' => $this->resource->nameAr,
            'author_name' => $this->resource->authorName,
            'language_code' => $this->resource->languageCode,
            'direction' => $this->resource->direction?->value,
            'version' => $this->resource->version,
            'pack' => [
                'url' => route('v1.content.packs.show', [
                    'resource' => $this->resource->id,
                    'version' => $this->resource->version,
                ], false),
                'size_bytes' => $this->resource->packSizeBytes,
                'sha256' => $this->resource->packSha256,
            ],
            'changes_since_min_version' => $this->resource->changesSinceMinVersion,
        ];
    }
}
