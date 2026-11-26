<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One run of a word's TQP subpaths (ADR 0090 step 13 A4). `flag` 0 is the word's own contours, 1 a loose contour attached to it.
 *
 * @property int $id
 * @property int $svg_mushaf_id
 * @property int $surah
 * @property int $ayah
 * @property int $position
 * @property int $first
 * @property int $count
 * @property int $flag
 */
final class SvgMushafWordContour extends Model
{
    protected $table = 'svg_mushaf_word_contours';

    /**
     * @return BelongsTo<SvgMushaf, $this>
     */
    public function mushaf(): BelongsTo
    {
        return $this->belongsTo(SvgMushaf::class, 'svg_mushaf_id');
    }
}
