<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A title or basmala block, an ayah mark, a sajda line or a hizb ornament of one page (ADR 0090 step 13 A4). Bounds are integers in
 * 1/32 page units, raw page space.
 *
 * @property int $id
 * @property int $svg_mushaf_id
 * @property int $page
 * @property int $kind
 * @property int $ord
 * @property int $surah
 * @property int $ayah
 * @property int $first
 * @property int $count
 * @property int $x0
 * @property int $y0
 * @property int $x1
 * @property int $y1
 */
final class SvgMushafContourBlock extends Model
{
    protected $table = 'svg_mushaf_contour_blocks';

    /**
     * @return BelongsTo<SvgMushaf, $this>
     */
    public function mushaf(): BelongsTo
    {
        return $this->belongsTo(SvgMushaf::class, 'svg_mushaf_id');
    }
}
