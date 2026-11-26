<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Repositories\Eloquent;

use App\Domains\Mushaf\Enums\WordBoxesStatus;
use App\Domains\Mushaf\Models\SvgMushaf;
use App\Domains\Mushaf\Models\SvgMushafContourBlock;
use App\Domains\Mushaf\Models\SvgMushafWordContour;
use App\Domains\Mushaf\Repositories\Contracts\SvgMushafContourRepository;
use App\Support\Repositories\EloquentRepository;
use Illuminate\Support\Carbon;

/**
 * @extends EloquentRepository<SvgMushafWordContour>
 */
final class EloquentSvgMushafContourRepository extends EloquentRepository implements SvgMushafContourRepository
{
    private const int CHUNK = 1000;

    protected function model(): string
    {
        return SvgMushafWordContour::class;
    }

    public function replace(int $svgMushafId, array $wordRows, array $blockRows, WordBoxesStatus $status, string $digest): void
    {
        SvgMushafWordContour::query()->where('svg_mushaf_id', $svgMushafId)->delete();
        SvgMushafContourBlock::query()->where('svg_mushaf_id', $svgMushafId)->delete();

        $now = Carbon::now()->format('Y-m-d H:i:s.u');

        foreach (array_chunk($wordRows, self::CHUNK) as $chunk) {
            SvgMushafWordContour::query()->insert(array_map(
                fn (array $row): array => $row + ['svg_mushaf_id' => $svgMushafId, 'created_at' => $now, 'updated_at' => $now],
                $chunk,
            ));
        }

        foreach (array_chunk($blockRows, self::CHUNK) as $chunk) {
            SvgMushafContourBlock::query()->insert(array_map(
                fn (array $row): array => $row + ['svg_mushaf_id' => $svgMushafId, 'created_at' => $now, 'updated_at' => $now],
                $chunk,
            ));
        }

        SvgMushaf::query()->whereKey($svgMushafId)->update(['contours_status' => $status->value, 'contours_digest' => $digest]);
    }
}
