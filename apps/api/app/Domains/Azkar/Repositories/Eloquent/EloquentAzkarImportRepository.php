<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Repositories\Eloquent;

use App\Domains\Azkar\Data\ImportPlan;
use App\Domains\Azkar\Repositories\Contracts\AzkarImportRepository;
use App\Domains\Content\Enums\PermissionStatus;
use App\Domains\Content\Models\AzkarCategory;
use App\Domains\Content\Models\AzkarChapter;
use App\Domains\Content\Models\AzkarEntry;
use App\Domains\Content\Models\AzkarEntryCategory;
use App\Domains\Content\Models\AzkarItem;
use App\Domains\Content\Models\AzkarNote;
use App\Domains\Content\Models\AzkarRecording;
use App\Domains\Content\Models\AzkarSegment;
use App\Domains\Content\Models\ContentSource;
use Illuminate\Database\Eloquent\Model;

final class EloquentAzkarImportRepository implements AzkarImportRepository
{
    private const int CHUNK = 500;

    public function sourcePermissionStatus(string $code): ?PermissionStatus
    {
        $source = ContentSource::query()->where('code', $code)->first();

        return $source instanceof ContentSource ? $source->permission_status : null;
    }

    public function itemTextHashes(int $resourceId): array
    {
        $hashes = [];

        /** @var AzkarItem $item */
        foreach (AzkarItem::query()->where('resource_id', $resourceId)->whereNotNull('source_text_sha256')->get() as $item) {
            $hashes[(string) $item->getAttribute('item_key')] = (string) $item->getAttribute('source_text_sha256');
        }

        return $hashes;
    }

    public function replaceForResource(int $resourceId, ImportPlan $plan): void
    {
        $this->delete(AzkarNote::class, $resourceId);
        $this->delete(AzkarRecording::class, $resourceId);
        $this->delete(AzkarSegment::class, $resourceId);
        $this->delete(AzkarEntryCategory::class, $resourceId);
        $this->delete(AzkarItem::class, $resourceId);
        $this->delete(AzkarEntry::class, $resourceId);
        $this->delete(AzkarCategory::class, $resourceId);
        $this->delete(AzkarChapter::class, $resourceId);

        $this->insert(AzkarChapter::class, $resourceId, $plan->chapters);
        $this->insert(AzkarCategory::class, $resourceId, $plan->categories);
        $this->insert(AzkarEntry::class, $resourceId, $plan->entries);
        $this->insert(AzkarItem::class, $resourceId, $plan->items);
        $this->insert(AzkarSegment::class, $resourceId, $plan->segments);
        $this->insert(AzkarEntryCategory::class, $resourceId, $plan->entryCategories);
        $this->insert(AzkarNote::class, $resourceId, $plan->notes);
        $this->insert(AzkarRecording::class, $resourceId, $plan->recordings);
    }

    /**
     * @param  class-string<Model>  $model
     */
    private function delete(string $model, int $resourceId): void
    {
        $model::query()->where('resource_id', $resourceId)->delete();
    }

    /**
     * @param  class-string<Model>  $model
     * @param  list<array<string, int|string|null>>  $rows
     */
    private function insert(string $model, int $resourceId, array $rows): void
    {
        foreach (array_chunk($rows, self::CHUNK) as $chunk) {
            $model::query()->insert(array_map(
                static fn (array $row): array => ['resource_id' => $resourceId] + $row,
                $chunk,
            ));
        }
    }
}
