<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Models;

use Database\Factories\SeerahPlaceFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * ADR 0091 place. Composite keys (resource_id, id) are read with where(), never find(), save() or update(). Rows are written by
 * the importer in one transaction and replaced on every run; Arabic text columns are byte-exact (utf8mb4_0900_bin).
 *
 * @property int $resource_id
 * @property int $id
 * @property string $slug
 * @property ?int $parent_id
 * @property string $kind
 * @property string $name_ar
 * @property ?float $lat
 * @property ?float $lng
 * @property ?string $geo_precision
 * @property ?string $geo_source
 * @property string $flags
 */
final class SeerahPlace extends Model
{
    /** @use HasFactory<SeerahPlaceFactory> */
    use HasFactory;

    protected $table = 'seerah_places';

    public $incrementing = false;

    public $timestamps = false;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'resource_id' => 'integer',
            'id' => 'integer',
            'parent_id' => 'integer',
            'lat' => 'float',
            'lng' => 'float',
        ];
    }

    protected static function newFactory(): SeerahPlaceFactory
    {
        return SeerahPlaceFactory::new();
    }
}
