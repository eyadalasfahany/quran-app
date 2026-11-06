<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Models;

use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Resource;
use Database\Factories\HadithBookFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Composite keys (resource_id, id): read with where(), never find(), save() or update().
 *
 * @property int $resource_id
 * @property int $id
 * @property string $book_number
 * @property string|null $title_ar
 * @property string|null $title_en
 * @property int $position
 * @property int $hadith_count
 * @property int $source_id
 * @property string $source_key
 */
final class HadithBook extends Model
{
    /** @use HasFactory<HadithBookFactory> */
    use HasFactory;

    protected $table = 'hadith_books';

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

    protected static function newFactory(): HadithBookFactory
    {
        return HadithBookFactory::new();
    }
}
