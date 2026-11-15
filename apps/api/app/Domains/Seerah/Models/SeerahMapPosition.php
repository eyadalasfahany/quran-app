<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Models;

use Database\Factories\SeerahMapPositionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * ADR 0091 map position. Composite keys (resource_id, id) are read with where(), never find(), save() or update(). Rows are written by
 * the importer in one transaction and replaced on every run; Arabic text columns are byte-exact (utf8mb4_0900_bin).
 *
 * @property int $resource_id
 * @property string $level
 * @property int $place_id
 * @property float $x
 * @property float $y
 * @property int $label_priority
 * @property string $label_side
 * @property bool $art_landmark
 */
final class SeerahMapPosition extends Model
{
    /** @use HasFactory<SeerahMapPositionFactory> */
    use HasFactory;

    protected $table = 'seerah_map_positions';

    public $incrementing = false;

    public $timestamps = false;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'resource_id' => 'integer',
            'place_id' => 'integer',
            'label_priority' => 'integer',
            'art_landmark' => 'boolean',
            'x' => 'float',
            'y' => 'float',
        ];
    }

    protected static function newFactory(): SeerahMapPositionFactory
    {
        return SeerahMapPositionFactory::new();
    }
}
