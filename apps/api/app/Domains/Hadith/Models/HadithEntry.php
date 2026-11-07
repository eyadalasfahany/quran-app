<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Models;

use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Resource;
use Carbon\CarbonImmutable;
use Database\Factories\HadithEntryFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Composite keys (resource_id, id): read with where(), never find(), save() or update().
 *
 * @property int $resource_id
 * @property int $id
 * @property int $book_id
 * @property int|null $chapter_id
 * @property string $hadith_number
 * @property string|null $arabic_number
 * @property string|null $number_first Lowest number of the span this row covers, when merged numbers point here (step 6b.3).
 * @property string|null $number_last Highest number of that span.
 * @property int $position
 * @property string $text_ar
 * @property string|null $text_en
 * @property string|null $narrator_en
 * @property string $text_search
 * @property string|null $source_url
 * @property int $source_id
 * @property string $source_key
 * @property string|null $source_code Origin of a filled row (openiti, hadithapicom, meeatif, hadithjson); null for the primary source.
 * @property string $source_text_sha256
 * @property string $source_version
 * @property CarbonImmutable $imported_at
 */
final class HadithEntry extends Model
{
    /** @use HasFactory<HadithEntryFactory> */
    use HasFactory;

    protected $table = 'hadith_entries';

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
            'chapter_id' => 'integer',
            'position' => 'integer',
            'source_id' => 'integer',
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

    protected static function newFactory(): HadithEntryFactory
    {
        return HadithEntryFactory::new();
    }
}
