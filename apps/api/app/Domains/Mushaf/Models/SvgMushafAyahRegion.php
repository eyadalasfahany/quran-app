<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $svg_mushaf_id
 * @property int $page
 * @property int $surah
 * @property int $ayah
 * @property string|null $label_x
 * @property string|null $label_y
 * @property string $polygon
 */
final class SvgMushafAyahRegion extends Model
{
    protected $table = 'svg_mushaf_ayah_regions';

    public $timestamps = false;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'id' => 'integer',
            'svg_mushaf_id' => 'integer',
            'page' => 'integer',
            'surah' => 'integer',
            'ayah' => 'integer',
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
