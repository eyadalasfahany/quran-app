<?php

declare(strict_types=1);

namespace App\Domains\Content\Models;

use Database\Factories\ChapterAudioFileFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $recitation_id
 * @property int $chapter_id
 * @property string $audio_url
 * @property int|null $size_bytes
 * @property int $duration_ms
 * @property string $format
 * @property int|null $first_ayah
 * @property int|null $last_ayah
 */
#[Fillable([
    'id',
    'recitation_id',
    'chapter_id',
    'audio_url',
    'size_bytes',
    'duration_ms',
    'format',
    'first_ayah',
    'last_ayah',
])]
#[UseFactory(ChapterAudioFileFactory::class)]
final class ChapterAudioFile extends Model
{
    /** @use HasFactory<ChapterAudioFileFactory> */
    use HasFactory;

    public $incrementing = false;

    public $timestamps = false;

    /**
     * @return BelongsTo<Recitation, $this>
     */
    public function recitation(): BelongsTo
    {
        return $this->belongsTo(Recitation::class);
    }

    /**
     * @return HasMany<RecitationTiming, $this>
     */
    public function timings(): HasMany
    {
        return $this->hasMany(RecitationTiming::class, 'audio_file_id');
    }
}
