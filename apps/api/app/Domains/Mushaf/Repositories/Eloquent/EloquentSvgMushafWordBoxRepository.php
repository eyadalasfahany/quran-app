<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Repositories\Eloquent;

use App\Domains\Mushaf\Enums\WordBoxesStatus;
use App\Domains\Mushaf\Models\SvgMushaf;
use App\Domains\Mushaf\Models\SvgMushafAyahRegion;
use App\Domains\Mushaf\Models\SvgMushafWordBox;
use App\Domains\Mushaf\Repositories\Contracts\SvgMushafWordBoxRepository;
use App\Support\Repositories\EloquentRepository;
use Illuminate\Support\Carbon;

/**
 * @extends EloquentRepository<SvgMushafWordBox>
 */
final class EloquentSvgMushafWordBoxRepository extends EloquentRepository implements SvgMushafWordBoxRepository
{
    private const int CHUNK = 1000;

    protected function model(): string
    {
        return SvgMushafWordBox::class;
    }

    public function editionId(string $key): ?int
    {
        $id = SvgMushaf::query()->where('key', $key)->value('id');

        return $id === null ? null : (int) $id;
    }

    public function regions(int $svgMushafId): array
    {
        $regions = [];

        $rows = SvgMushafAyahRegion::query()->toBase()
            ->where('svg_mushaf_id', $svgMushafId)
            ->orderBy('page')->orderBy('surah')->orderBy('ayah')
            ->get(['page', 'surah', 'ayah', 'polygon']);

        foreach ($rows as $row) {
            $regions[(int) $row->page][] = ['surah' => (int) $row->surah, 'ayah' => (int) $row->ayah, 'polygon' => (string) $row->polygon];
        }

        return $regions;
    }

    public function replace(int $svgMushafId, array $rows, WordBoxesStatus $status, string $digest): void
    {
        $this->query()->where('svg_mushaf_id', $svgMushafId)->delete();

        $now = Carbon::now()->format('Y-m-d H:i:s.u');

        foreach (array_chunk($rows, self::CHUNK) as $chunk) {
            $this->query()->insert(array_map(
                fn (array $row): array => $row + ['svg_mushaf_id' => $svgMushafId, 'created_at' => $now, 'updated_at' => $now],
                $chunk,
            ));
        }

        SvgMushaf::query()->whereKey($svgMushafId)->update(['word_boxes_status' => $status->value, 'word_boxes_digest' => $digest]);
    }
}
