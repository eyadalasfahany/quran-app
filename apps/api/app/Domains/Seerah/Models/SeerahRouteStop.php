<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Models;

use Database\Factories\SeerahRouteStopFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * ADR 0091 route stop. Composite keys (resource_id, id) are read with where(), never find(), save() or update(). Rows are written by
 * the importer in one transaction and replaced on every run; Arabic text columns are byte-exact (utf8mb4_0900_bin).
 *
 * @property int $resource_id
 * @property int $route_id
 * @property int $position
 * @property int $place_id
 */
final class SeerahRouteStop extends Model
{
    /** @use HasFactory<SeerahRouteStopFactory> */
    use HasFactory;

    protected $table = 'seerah_route_stops';

    public $incrementing = false;

    public $timestamps = false;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'resource_id' => 'integer',
            'route_id' => 'integer',
            'position' => 'integer',
            'place_id' => 'integer',
        ];
    }

    protected static function newFactory(): SeerahRouteStopFactory
    {
        return SeerahRouteStopFactory::new();
    }
}
