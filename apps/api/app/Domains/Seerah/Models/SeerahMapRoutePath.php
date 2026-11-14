<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Models;

use Database\Factories\SeerahMapRoutePathFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * ADR 0089 route path. Composite keys (resource_id, id) are read with where(), never find(), save() or update(). Rows are written by
 * the importer in one transaction and replaced on every run; Arabic text columns are byte-exact (utf8mb4_0900_bin).
 *
 * @property int $resource_id
 * @property string $level
 * @property int $route_id
 * @property int $from_place_id
 * @property int $to_place_id
 * @property string $path_d
 */
final class SeerahMapRoutePath extends Model
{
    /** @use HasFactory<SeerahMapRoutePathFactory> */
    use HasFactory;

    protected $table = 'seerah_map_route_paths';

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
            'from_place_id' => 'integer',
            'to_place_id' => 'integer',
        ];
    }

    protected static function newFactory(): SeerahMapRoutePathFactory
    {
        return SeerahMapRoutePathFactory::new();
    }
}
