<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Models;

use Database\Factories\SeerahEventFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * ADR 0091 event. Composite keys (resource_id, id) are read with where(), never find(), save() or update(). Rows are written by
 * the importer in one transaction and replaced on every run; Arabic text columns are byte-exact (utf8mb4_0900_bin).
 *
 * @property int $resource_id
 * @property int $id
 * @property string $slug
 * @property int $position
 * @property int $section_id
 * @property ?int $paragraph_from
 * @property ?int $paragraph_to
 * @property string $title_ar
 * @property string $kind
 * @property ?int $place_id
 * @property ?string $place_basis
 * @property string $also
 * @property ?int $age_from
 * @property ?int $age_to
 * @property ?string $era
 * @property ?int $hijri_from
 * @property ?int $hijri_to
 * @property ?string $year_basis
 * @property ?string $certainty
 * @property ?int $route_id
 * @property string $flags
 */
final class SeerahEvent extends Model
{
    /** @use HasFactory<SeerahEventFactory> */
    use HasFactory;

    protected $table = 'seerah_events';

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
            'position' => 'integer',
            'section_id' => 'integer',
            'paragraph_from' => 'integer',
            'paragraph_to' => 'integer',
            'place_id' => 'integer',
            'age_from' => 'integer',
            'age_to' => 'integer',
            'hijri_from' => 'integer',
            'hijri_to' => 'integer',
            'route_id' => 'integer',
        ];
    }

    protected static function newFactory(): SeerahEventFactory
    {
        return SeerahEventFactory::new();
    }
}
