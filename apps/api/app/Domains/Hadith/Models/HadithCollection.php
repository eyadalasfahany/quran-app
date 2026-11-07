<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Models;

use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Resource;
use Carbon\CarbonImmutable;
use Database\Factories\HadithCollectionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Composite keys (resource_id, id): read with where(), never find(), save() or update().
 *
 * @property int $resource_id
 * @property int $id
 * @property string $slug
 * @property int $source_id
 * @property string $source_code
 * @property string|null $title_ar
 * @property string|null $title_en
 * @property string|null $author_ar
 * @property string|null $author_en
 * @property string $attribution_ar
 * @property string $attribution_en
 * @property string|null $source_url
 * @property int $total_hadith
 * @property int $books_count
 * @property bool $is_complete
 * @property int $incomplete_count
 * @property string $source_version
 * @property CarbonImmutable $imported_at
 */
final class HadithCollection extends Model
{
    /** @use HasFactory<HadithCollectionFactory> */
    use HasFactory;

    protected $table = 'hadith_collections';

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
            'total_hadith' => 'integer',
            'books_count' => 'integer',
            'is_complete' => 'boolean',
            'incomplete_count' => 'integer',
            'imported_at' => 'immutable_datetime',
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

    protected static function newFactory(): HadithCollectionFactory
    {
        return HadithCollectionFactory::new();
    }
}
