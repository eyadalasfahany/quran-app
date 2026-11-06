<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Models;

use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Resource;
use Database\Factories\HadithChapterFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Composite keys (resource_id, id): read with where(), never find(), save() or update().
 *
 * @property int $resource_id
 * @property int $id
 * @property int $book_id
 * @property int $chapter_number
 * @property string|null $source_chapter_key
 * @property string|null $title_ar
 * @property string|null $title_en
 * @property int $position
 * @property int $hadith_count
 * @property int $source_id
 * @property string $source_key
 */
final class HadithChapter extends Model
{
    /** @use HasFactory<HadithChapterFactory> */
    use HasFactory;

    protected $table = 'hadith_chapters';

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
            'book_id' => 'integer',
            'chapter_number' => 'integer',
            'position' => 'integer',
            'hadith_count' => 'integer',
            'source_id' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<ContentSource, $this>
     */
    public function source(): BelongsTo
    {
        return $this->belongsTo(ContentSource::class, 'source_id');
    }

    /**
     * @return BelongsTo<resource, $this>
     */
    public function resource(): BelongsTo
    {
        return $this->belongsTo(Resource::class, 'resource_id');
    }

    protected static function newFactory(): HadithChapterFactory
    {
        return HadithChapterFactory::new();
    }
}
