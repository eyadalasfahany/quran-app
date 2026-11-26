<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Repositories\Eloquent;

use App\Domains\Mushaf\Models\SvgMushaf;
use App\Domains\Mushaf\Models\SvgMushafAyahRegion;
use App\Domains\Mushaf\Models\SvgMushafContourBlock;
use App\Domains\Mushaf\Models\SvgMushafPage;
use App\Domains\Mushaf\Models\SvgMushafWordBox;
use App\Domains\Mushaf\Models\SvgMushafWordContour;
use App\Domains\Mushaf\Repositories\Contracts\SvgMushafPackRepository;
use App\Support\Repositories\EloquentRepository;

/**
 * @extends EloquentRepository<SvgMushaf>
 *
 * @phpstan-import-type PackPageRow from SvgMushafPackRepository
 * @phpstan-import-type PackRegionRow from SvgMushafPackRepository
 * @phpstan-import-type PackWordBoxRow from SvgMushafPackRepository
 * @phpstan-import-type PackWordContourRow from SvgMushafPackRepository
 * @phpstan-import-type PackContourBlockRow from SvgMushafPackRepository
 */
final class EloquentSvgMushafPackRepository extends EloquentRepository implements SvgMushafPackRepository
{
    protected function model(): string
    {
        return SvgMushaf::class;
    }

    public function findByKey(string $key): ?SvgMushaf
    {
        return $this->query()->where('key', $key)->first();
    }

    public function pages(int $svgMushafId): iterable
    {
        $rows = SvgMushafPage::query()->toBase()
            ->where('svg_mushaf_id', $svgMushafId)
            ->orderBy('page')
            ->select(['page', 'tqp_sha256', 'tqp_bytes'])
            ->cursor();

        foreach ($rows as $row) {
            /** @var PackPageRow $page */
            $page = [
                'page' => (int) $row->page,
                'tqp_sha256' => $row->tqp_sha256 === null ? null : (string) $row->tqp_sha256,
                'tqp_bytes' => $row->tqp_bytes === null ? null : (int) $row->tqp_bytes,
            ];

            yield $page;
        }
    }

    public function regions(int $svgMushafId): iterable
    {
        $rows = SvgMushafAyahRegion::query()->toBase()
            ->where('svg_mushaf_id', $svgMushafId)
            ->orderBy('page')->orderBy('surah')->orderBy('ayah')
            ->select(['page', 'surah', 'ayah', 'label_x', 'label_y', 'polygon'])
            ->cursor();

        foreach ($rows as $row) {
            /** @var PackRegionRow $region */
            $region = [
                'page' => (int) $row->page,
                'surah' => (int) $row->surah,
                'ayah' => (int) $row->ayah,
                'label_x' => $row->label_x === null ? null : (string) $row->label_x,
                'label_y' => $row->label_y === null ? null : (string) $row->label_y,
                'polygon' => (string) $row->polygon,
            ];

            yield $region;
        }
    }

    public function wordBoxes(int $svgMushafId): iterable
    {
        $rows = SvgMushafWordBox::query()->toBase()
            ->where('svg_mushaf_id', $svgMushafId)
            ->orderBy('surah')->orderBy('ayah')->orderBy('position')
            ->select(['page', 'line', 'surah', 'ayah', 'position', 'x0', 'y0', 'x1', 'y1'])
            ->cursor();

        foreach ($rows as $row) {
            /** @var PackWordBoxRow $box */
            $box = [
                'page' => (int) $row->page,
                'line' => (int) $row->line,
                'surah' => (int) $row->surah,
                'ayah' => (int) $row->ayah,
                'position' => (int) $row->position,
                'x0' => (string) $row->x0,
                'y0' => (string) $row->y0,
                'x1' => (string) $row->x1,
                'y1' => (string) $row->y1,
            ];

            yield $box;
        }
    }

    public function wordContours(int $svgMushafId): iterable
    {
        $rows = SvgMushafWordContour::query()->toBase()
            ->where('svg_mushaf_id', $svgMushafId)
            ->orderBy('surah')->orderBy('ayah')->orderBy('position')->orderBy('first')
            ->select(['surah', 'ayah', 'position', 'first', 'count', 'flag'])
            ->cursor();

        foreach ($rows as $row) {
            /** @var PackWordContourRow $run */
            $run = [
                'surah' => (int) $row->surah,
                'ayah' => (int) $row->ayah,
                'position' => (int) $row->position,
                'first' => (int) $row->first,
                'count' => (int) $row->count,
                'flag' => (int) $row->flag,
            ];

            yield $run;
        }
    }

    public function contourBlocks(int $svgMushafId): iterable
    {
        $rows = SvgMushafContourBlock::query()->toBase()
            ->where('svg_mushaf_id', $svgMushafId)
            ->orderBy('page')->orderBy('kind')->orderBy('ord')
            ->select(['page', 'kind', 'ord', 'surah', 'ayah', 'first', 'count', 'x0', 'y0', 'x1', 'y1'])
            ->cursor();

        foreach ($rows as $row) {
            /** @var PackContourBlockRow $block */
            $block = [
                'page' => (int) $row->page,
                'kind' => (int) $row->kind,
                'ord' => (int) $row->ord,
                'surah' => (int) $row->surah,
                'ayah' => (int) $row->ayah,
                'first' => (int) $row->first,
                'count' => (int) $row->count,
                'x0' => (int) $row->x0,
                'y0' => (int) $row->y0,
                'x1' => (int) $row->x1,
                'y1' => (int) $row->y1,
            ];

            yield $block;
        }
    }
}
