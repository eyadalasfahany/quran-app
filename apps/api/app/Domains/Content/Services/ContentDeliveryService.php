<?php

declare(strict_types=1);

namespace App\Domains\Content\Services;

use App\Domains\Content\Data\ContentChangeItemData;
use App\Domains\Content\Data\ContentChangesPageData;
use App\Domains\Content\Data\ContentChangesQueryData;
use App\Domains\Content\Data\ContentManifestData;
use App\Domains\Content\Data\ContentManifestEntryData;
use App\Domains\Content\Data\ContentPackData;
use App\Domains\Content\Exceptions\ChangesGoneException;
use App\Domains\Content\Models\ContentChange;
use App\Domains\Content\Models\ContentPack;
use App\Domains\Content\Packs\ChangeCursor;
use App\Domains\Content\Packs\PackSchema;
use App\Domains\Content\Repositories\Contracts\ContentChangeRepository;
use App\Domains\Content\Repositories\Contracts\ContentPackRepository;
use App\Domains\Content\Repositories\Contracts\ResourceRepository;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\Storage;

final class ContentDeliveryService
{
    public function __construct(
        private readonly ResourceRepository $resources,
        private readonly ContentPackRepository $packs,
        private readonly ContentChangeRepository $changes,
    ) {}

    public function manifest(): ContentManifestData
    {
        $entries = [];
        $newest = null;

        foreach ($this->resources->activeWithPacks() as $resource) {
            $pack = $resource->contentPacks->sortByDesc(fn (ContentPack $pack): int => $pack->version)->first();

            if (! $pack instanceof ContentPack) {
                continue;
            }

            if ($newest === null || $pack->built_at->greaterThan($newest)) {
                $newest = $pack->built_at;
            }

            $entries[] = new ContentManifestEntryData(
                id: $resource->id,
                group: $resource->group,
                name: $resource->name,
                authorName: $resource->author_name,
                languageCode: $resource->language_code,
                direction: $resource->direction,
                version: $pack->version,
                packSizeBytes: $pack->size_bytes,
                packSha256: $pack->sha256,
                changesSinceMinVersion: $resource->changes_floor_version,
            );
        }

        return new ContentManifestData(
            generatedAt: $newest ?? CarbonImmutable::parse('1970-01-01T00:00:00.000000Z'),
            packSchemaVersion: PackSchema::VERSION,
            resources: $entries,
        );
    }

    public function pack(int $resourceId, int $version): ContentPackData
    {
        $resource = $this->resources->find($resourceId);

        if ($resource === null || ! $resource->is_active || $resource->group->isIgnored()) {
            throw new ModelNotFoundException('Content pack not found.');
        }

        $pack = $this->packs->findForVersion($resourceId, $version);

        if ($pack === null || ! Storage::disk('local')->exists($pack->path)) {
            throw new ModelNotFoundException('Content pack not found.');
        }

        return new ContentPackData(
            resourceId: $pack->resource_id,
            version: $pack->version,
            path: $pack->path,
            sizeBytes: $pack->size_bytes,
            sha256: $pack->sha256,
            rowCount: $pack->row_count,
            schemaVersion: $pack->schema_version,
            builtAt: $pack->built_at,
        );
    }

    public function absolutePath(ContentPackData $pack): string
    {
        return Storage::disk('local')->path($pack->path);
    }

    public function changes(ContentChangesQueryData $query): ContentChangesPageData
    {
        $resource = $this->resources->find($query->resourceId);

        if ($resource === null || ! $resource->is_active || $resource->group->isIgnored()) {
            throw new ModelNotFoundException('Resource not found.');
        }

        if ($query->sinceVersion < $resource->changes_floor_version) {
            throw new ChangesGoneException;
        }

        $minimum = $this->changes->minimumVersionAfter($resource->id, $query->sinceVersion);

        // No stored change at since_version + 1 means a later version was pruned, or the
        // resource moved forward and every change row is gone.
        if ($minimum === null && $resource->version > $query->sinceVersion) {
            throw new ChangesGoneException;
        }

        if ($minimum !== null && $minimum > $query->sinceVersion + 1) {
            throw new ChangesGoneException;
        }

        $rows = $this->changes->after($resource->id, $query->sinceVersion, $query->afterId, $query->limit + 1);
        $hasMore = $rows->count() > $query->limit;
        $page = $rows->take($query->limit);
        $items = [];

        foreach ($page as $change) {
            $items[] = $this->item($change);
        }

        $last = $page->last();

        return new ContentChangesPageData(
            items: $items,
            nextCursor: $hasMore && $last instanceof ContentChange ? ChangeCursor::encode($last->id) : null,
        );
    }

    private function item(ContentChange $change): ContentChangeItemData
    {
        return new ContentChangeItemData(
            id: $change->id,
            version: $change->version,
            entity: $change->entity,
            entityKey: $change->entity_key,
            op: $change->op,
            payload: $change->payload,
        );
    }
}
