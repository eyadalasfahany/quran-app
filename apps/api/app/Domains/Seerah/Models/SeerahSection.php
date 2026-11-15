<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Models;

use Database\Factories\SeerahSectionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * ADR 0091 section. Composite keys (resource_id, id) are read with where(), never find(), save() or update(). Rows are written by
 * the importer in one transaction and replaced on every run; Arabic text columns are byte-exact (utf8mb4_0900_bin).
 *
 * @property int $resource_id
 * @property int $id
 * @property string $code
 * @property string $level
 * @property string $title_ar
 * @property int $page
 * @property int $position
 * @property ?int $paragraph_from
 * @property ?int $paragraph_to
 */
final class SeerahSection extends Model
{
    /** @use HasFactory<SeerahSectionFactory> */
    use HasFactory;

    protected $table = 'seerah_sections';

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
            'page' => 'integer',
            'position' => 'integer',
            'paragraph_from' => 'integer',
            'paragraph_to' => 'integer',
        ];
    }

    protected static function newFactory(): SeerahSectionFactory
    {
        return SeerahSectionFactory::new();
    }
}
