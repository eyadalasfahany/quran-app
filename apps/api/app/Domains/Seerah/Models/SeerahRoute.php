<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Models;

use Database\Factories\SeerahRouteFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * ADR 0091 route. Composite keys (resource_id, id) are read with where(), never find(), save() or update(). Rows are written by
 * the importer in one transaction and replaced on every run; Arabic text columns are byte-exact (utf8mb4_0900_bin).
 *
 * @property int $resource_id
 * @property int $id
 * @property string $slug
 * @property string $kind
 * @property string $name_ar
 */
final class SeerahRoute extends Model
{
    /** @use HasFactory<SeerahRouteFactory> */
    use HasFactory;

    protected $table = 'seerah_routes';

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
        ];
    }

    protected static function newFactory(): SeerahRouteFactory
    {
        return SeerahRouteFactory::new();
    }
}
