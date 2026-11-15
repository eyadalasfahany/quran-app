<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $svg_mushaf_id
 * @property int $page
 * @property int $line
 * @property int $surah
 * @property int $ayah
 * @property int $position
 * @property string $x0
 * @property string $y0
 * @property string $x1
 * @property string $y1
 */
final class SvgMushafWordBox extends Model
{
    protected $table = 'svg_mushaf_word_boxes';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'id' => 'integer',
            'svg_mushaf_id' => 'integer',
            'page' => 'integer',
            'line' => 'integer',
            'surah' => 'integer',
            'ayah' => 'integer',
            'position' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<SvgMushaf, $this>
     */
    public function mushaf(): BelongsTo
    {
        return $this->belongsTo(SvgMushaf::class, 'svg_mushaf_id');
    }
}
