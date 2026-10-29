<?php

declare(strict_types=1);

namespace App\Domains\Content\Http\Resources;

use App\Domains\Content\Data\ContentManifestData;
use App\Domains\Content\Enums\ServedResourceGroup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property ContentManifestData $resource
 */
final class ContentManifestResource extends JsonResource
{
    public static $wrap = null;

    /**
     * @return array{
     *     generated_at: string,
     *     pack_schema_version: int,
     *     resources: list<array{
     *         id: int,
     *         group: ServedResourceGroup,
     *         name: string|null,
     *         name_ar: string|null,
     *         style: string|null,
     *         author_name: string|null,
     *         author_ar: string|null,
     *         language_code: string|null,
     *         direction: string|null,
     *         version: int,
     *         pack: array{url: string, size_bytes: int, sha256: string},
     *         changes_since_min_version: int,
     *         is_default: bool
     *     }>
     * }
     */
    public function toArray(Request $request): array
    {
        $resources = [];

        foreach ($this->resource->resources as $entry) {
            $resources[] = (new ContentManifestEntryResource($entry))->toArray($request);
        }

        return [
            /** @format date-time */
            'generated_at' => $this->resource->generatedAt->toIso8601ZuluString('millisecond'),
            'pack_schema_version' => $this->resource->packSchemaVersion,
            'resources' => $resources,
        ];
    }

    public function withResponse(Request $request, JsonResponse $response): void
    {
        $etag = '"'.hash('sha256', (string) $response->getContent()).'"';
        $response->headers->set('ETag', $etag);
        $response->headers->set('Cache-Control', 'public, max-age=300');

        if ($this->noneMatch($request, $etag)) {
            $response->setStatusCode(304);
            $response->setContent('');
            $response->headers->remove('Content-Length');
        }
    }

    private function noneMatch(Request $request, string $etag): bool
    {
        $header = $request->headers->get('If-None-Match');

        if (! is_string($header) || $header === '') {
            return false;
        }

        if (trim($header) === '*') {
            return true;
        }

        foreach (explode(',', $header) as $candidate) {
            if (trim($candidate) === $etag) {
                return true;
            }
        }

        return false;
    }
}
