<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $svg_mushaf_id
 * @property int $page
 * @property string $svg_blob_sha
 * @property int $svg_bytes
 * @property string $gz_sha256
 * @property int $gz_bytes
 */
final class SvgMushafPage extends Model
{
    protected $table = 'svg_mushaf_pages';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'id' => 'integer',
            'svg_mushaf_id' => 'integer',
            'page' => 'integer',
            'svg_bytes' => 'integer',
            'gz_bytes' => 'integer',
            'tqp_bytes' => 'integer',
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
