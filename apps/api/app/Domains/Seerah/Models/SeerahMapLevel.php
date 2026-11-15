<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Models;

use Database\Factories\SeerahMapLevelFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * ADR 0091 map level. Composite keys (resource_id, id) are read with where(), never find(), save() or update(). Rows are written by
 * the importer in one transaction and replaced on every run; Arabic text columns are byte-exact (utf8mb4_0900_bin).
 *
 * @property int $resource_id
 * @property string $level
 * @property int $parent_place_id
 * @property string $viewbox
 * @property string $art
 */
final class SeerahMapLevel extends Model
{
    /** @use HasFactory<SeerahMapLevelFactory> */
    use HasFactory;

    protected $table = 'seerah_map_levels';

    public $incrementing = false;

    public $timestamps = false;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'resource_id' => 'integer',
            'parent_place_id' => 'integer',
        ];
    }

    protected static function newFactory(): SeerahMapLevelFactory
    {
        return SeerahMapLevelFactory::new();
    }
}
