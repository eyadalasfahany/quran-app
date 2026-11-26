<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Models;

use App\Domains\Mushaf\Enums\WordBoxesStatus;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $key
 * @property string $folder
 * @property int $edition_year
 * @property string $source_commit
 * @property int $page_count
 * @property int $ayah_count
 * @property CarbonImmutable $imported_at
 * @property WordBoxesStatus $word_boxes_status
 * @property string|null $word_boxes_digest
 * @property WordBoxesStatus $contours_status
 * @property string|null $contours_digest
 */
final class SvgMushaf extends Model
{
    protected $table = 'svg_mushafs';

    /** @var list<string> */
    protected $fillable = ['key', 'folder', 'edition_year', 'source_commit', 'page_count', 'ayah_count', 'imported_at'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'id' => 'integer',
            'edition_year' => 'integer',
            'page_count' => 'integer',
            'ayah_count' => 'integer',
            'imported_at' => 'immutable_datetime',
            'word_boxes_status' => WordBoxesStatus::class,
            'contours_status' => WordBoxesStatus::class,
        ];
    }

    /**
     * @return HasMany<SvgMushafPage, $this>
     */
    public function pages(): HasMany
    {
        return $this->hasMany(SvgMushafPage::class, 'svg_mushaf_id');
    }

    /**
     * @return HasMany<SvgMushafAyahRegion, $this>
     */
    public function regions(): HasMany
    {
        return $this->hasMany(SvgMushafAyahRegion::class, 'svg_mushaf_id');
    }
}
