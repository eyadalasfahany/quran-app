<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Models;

use Carbon\CarbonImmutable;
use Database\Factories\SeerahBookFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * ADR 0091 book. Composite keys (resource_id, id) are read with where(), never find(), save() or update(). Rows are written by
 * the importer in one transaction and replaced on every run; Arabic text columns are byte-exact (utf8mb4_0900_bin).
 *
 * @property int $resource_id
 * @property int $id
 * @property string $slug
 * @property string $title_ar
 * @property string $author_ar
 * @property string $edition_ar
 * @property string $attribution_ar
 * @property string $attribution_en
 * @property int $source_id
 * @property string $source_version
 * @property string $source_sha256
 * @property string $canonical_sha256
 * @property int $sections_count
 * @property int $paragraphs_count
 * @property int $places_count
 * @property int $events_count
 * @property int $routes_count
 * @property CarbonImmutable $imported_at
 */
final class SeerahBook extends Model
{
    /** @use HasFactory<SeerahBookFactory> */
    use HasFactory;

    protected $table = 'seerah_books';

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
            'source_id' => 'integer',
            'sections_count' => 'integer',
            'paragraphs_count' => 'integer',
            'places_count' => 'integer',
            'events_count' => 'integer',
            'routes_count' => 'integer',
            'imported_at' => 'immutable_datetime',
        ];
    }

    protected static function newFactory(): SeerahBookFactory
    {
        return SeerahBookFactory::new();
    }
}
