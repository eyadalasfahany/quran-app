<?php

declare(strict_types=1);

namespace App\Domains\Content\Services;

use App\Domains\Content\Data\ContentChangeItemData;
use App\Domains\Content\Data\ContentChangesPageData;
use App\Domains\Content\Data\ContentChangesQueryData;
use App\Domains\Content\Data\ContentManifestData;
use App\Domains\Content\Data\ContentManifestEntryData;
use App\Domains\Content\Data\ContentPackData;
use App\Domains\Content\Enums\LanguageCode;
use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Exceptions\ChangesGoneException;
use App\Domains\Content\Models\ContentChange;
use App\Domains\Content\Models\ContentPack;
use App\Domains\Content\Models\Resource;
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
            if (! $this->isServed($resource)) {
                continue;
            }

            $pack = $resource->contentPacks->sortByDesc(fn (ContentPack $pack): int => $pack->version)->first();

            if (! $pack instanceof ContentPack) {
                continue;
            }

            if (! Storage::disk('local')->exists($pack->path)) {
                continue;
            }

            if ($newest === null || $pack->built_at->greaterThan($newest)) {
                $newest = $pack->built_at;
            }

            $entries[] = new ContentManifestEntryData(
                id: $resource->id,
                group: $resource->group,
                name: $resource->name,
                nameAr: $this->servedArabicName($resource),
                style: $this->servedStyle($resource),
                authorName: $resource->author_name,
                authorAr: $this->servedArabicAuthor($resource),
                languageCode: $resource->language_code,
                direction: $resource->direction,
                version: $pack->version,
                packSizeBytes: $pack->size_bytes,
                packSha256: $pack->sha256,
                changesSinceMinVersion: $resource->changes_floor_version,
                isDefault: $this->isDefault($resource),
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

        if ($resource === null || ! $resource->is_active || $resource->group->isIgnored() || ! $this->isServed($resource)) {
            throw new ModelNotFoundException(__('problems.content_pack_not_found'));
        }

        $pack = $this->packs->findForVersion($resourceId, $version);

        if ($pack === null || ! Storage::disk('local')->exists($pack->path)) {
            throw new ModelNotFoundException(__('problems.content_pack_not_found'));
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

        if ($resource === null || ! $resource->is_active || $resource->group->isIgnored() || ! $this->isServed($resource)) {
            throw new ModelNotFoundException(__('problems.resource_not_found'));
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

    /**
     * ADR 0015: only Arabic tafsirs are served. ADR 0031 §1: a source without granted rights is never served.
     */
    private function isServed(Resource $resource): bool
    {
        // ADR 0031 §12: only the primary Azkar source is served. Other Azkar resources stay imported for comparison.
        if ($resource->group === ResourceGroup::Azkar && $resource->source?->code !== config('azkar.primary_source', 'opendua')) {
            return false;
        }

        return $resource->group !== ResourceGroup::Tafsirs || $resource->language_code === LanguageCode::Arabic->value;
    }

    /**
     * True only for the configured chapter reciter. The value is a QF source id, not our resource id.
     */
    private function isDefault(Resource $resource): bool
    {
        $default = config('quran.default_recitation');

        return $resource->group === ResourceGroup::ChapterRecitations
            && is_int($default)
            && (int) $resource->source_key === $default;
    }

    /**
     * Chapter recitations carry recitations.style as stored (QF English: Murattal, Mujawwad, Muallim).
     * Every other group is null. The recitation is already eager-loaded for the Arabic name.
     */
    private function servedStyle(Resource $resource): ?string
    {
        if ($resource->group !== ResourceGroup::ChapterRecitations) {
            return null;
        }

        $style = $resource->recitation?->style;

        return is_string($style) ? $style : null;
    }

    /**
     * A chapter recitation uses recitations.reciter_name_ar when it is set.
     * A tafsir uses the config override for a QF source id over the catalogue's name_ar.
     * Names are not Quran text.
     */
    private function servedArabicName(Resource $resource): ?string
    {
        if ($resource->group === ResourceGroup::ChapterRecitations) {
            $reciterName = $resource->recitation?->reciter_name_ar;

            if (is_string($reciterName)) {
                return $reciterName;
            }
        }

        if ($resource->group === ResourceGroup::Tafsirs) {
            $overrides = config('quran.display_names.ar', []);
            $override = $overrides[(int) $resource->source_key] ?? null;

            if (is_string($override)) {
                return $override;
            }
        }

        return $resource->name_ar;
    }

    private function servedArabicAuthor(Resource $resource): ?string
    {
        if ($resource->group === ResourceGroup::Tafsirs) {
            $overrides = config('quran.display_authors.ar', []);
            $override = $overrides[(int) $resource->source_key] ?? null;

            if (is_string($override)) {
                return $override;
            }
        }

        return null;
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
