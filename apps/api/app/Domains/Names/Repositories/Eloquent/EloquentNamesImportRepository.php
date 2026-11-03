<?php

declare(strict_types=1);

namespace App\Domains\Names\Repositories\Eloquent;

use App\Domains\Content\Models\Name;
use App\Domains\Content\Models\NamesList;
use App\Domains\Content\Models\NamesNote;
use App\Domains\Content\Models\NamesVerse;
use App\Domains\Names\Data\NamesImportPlan;
use App\Domains\Names\Repositories\Contracts\NamesImportRepository;
use Illuminate\Database\Eloquent\Model;

final class EloquentNamesImportRepository implements NamesImportRepository
{
    public function replaceForResource(int $resourceId, NamesImportPlan $plan): void
    {
        $this->delete(NamesNote::class, $resourceId);
        $this->delete(NamesVerse::class, $resourceId);
        $this->delete(Name::class, $resourceId);
        $this->delete(NamesList::class, $resourceId);

        NamesList::query()->insert([
            'resource_id' => $resourceId,
            'list_slug' => $plan->list['list_slug'],
            'title_ar' => $plan->list['title_ar'],
            'source_label_ar' => $plan->list['source_label_ar'],
            'attribution_ar' => $plan->list['attribution_ar'],
            'attribution_en' => $plan->list['attribution_en'],
            'edition_reference' => $plan->list['edition_reference'],
            'source_version' => $plan->list['source_version'],
        ]);

        foreach (array_chunk($plan->names, 100) as $chunk) {
            Name::query()->insert(array_map(
                static fn (array $row): array => ['resource_id' => $resourceId] + $row,
                $chunk,
            ));
        }
    }

    /**
     * @param  class-string<Model>  $model
     */
    private function delete(string $model, int $resourceId): void
    {
        $model::query()->where('resource_id', $resourceId)->delete();
    }
}
