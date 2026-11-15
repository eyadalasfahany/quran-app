<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Models;

use Database\Factories\SeerahParagraphFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * ADR 0091 paragraph. Composite keys (resource_id, id) are read with where(), never find(), save() or update(). Rows are written by
 * the importer in one transaction and replaced on every run; Arabic text columns are byte-exact (utf8mb4_0900_bin).
 *
 * @property int $resource_id
 * @property int $id
 * @property string $code
 * @property int $section_id
 * @property int $position
 * @property int $page
 * @property string $text_ar
 * @property string $text_sha256
 */
final class SeerahParagraph extends Model
{
    /** @use HasFactory<SeerahParagraphFactory> */
    use HasFactory;

    protected $table = 'seerah_paragraphs';

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
            'section_id' => 'integer',
            'position' => 'integer',
            'page' => 'integer',
        ];
    }

    protected static function newFactory(): SeerahParagraphFactory
    {
        return SeerahParagraphFactory::new();
    }
}
