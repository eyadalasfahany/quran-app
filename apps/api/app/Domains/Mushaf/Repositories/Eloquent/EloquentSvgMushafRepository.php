<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Repositories\Eloquent;

use App\Domains\Mushaf\Models\SvgMushaf;
use App\Domains\Mushaf\Models\SvgMushafAyahRegion;
use App\Domains\Mushaf\Models\SvgMushafPage;
use App\Domains\Mushaf\Records\SvgMushafPlan;
use App\Domains\Mushaf\Repositories\Contracts\SvgMushafRepository;
use App\Support\Repositories\EloquentRepository;
use Illuminate\Support\Carbon;

/**
 * @extends EloquentRepository<SvgMushaf>
 */
final class EloquentSvgMushafRepository extends EloquentRepository implements SvgMushafRepository
{
    private const int CHUNK = 500;

    protected function model(): string
    {
        return SvgMushaf::class;
    }

    public function replace(SvgMushafPlan $plan): void
    {
        $mushaf = $this->query()->updateOrCreate(
            ['key' => $plan->key],
            [
                'folder' => $plan->folder,
                'edition_year' => $plan->editionYear,
                'source_commit' => $plan->commit,
                'page_count' => $plan->pageCount,
                'ayah_count' => $plan->ayahCount,
                'imported_at' => Carbon::now(),
            ],
        );

        SvgMushafPage::query()->where('svg_mushaf_id', $mushaf->id)->delete();
        SvgMushafAyahRegion::query()->where('svg_mushaf_id', $mushaf->id)->delete();

        $now = Carbon::now()->format('Y-m-d H:i:s.u');

        foreach (array_chunk($plan->pages, self::CHUNK) as $chunk) {
            $rows = [];

            foreach ($chunk as $page) {
                $rows[] = $page + ['svg_mushaf_id' => $mushaf->id, 'created_at' => $now, 'updated_at' => $now];
            }

            SvgMushafPage::query()->insert($rows);
        }

        foreach (array_chunk($plan->regions, self::CHUNK) as $chunk) {
            $rows = [];

            foreach ($chunk as $region) {
                $rows[] = $region + ['svg_mushaf_id' => $mushaf->id];
            }

            SvgMushafAyahRegion::query()->insert($rows);
        }
    }
}
