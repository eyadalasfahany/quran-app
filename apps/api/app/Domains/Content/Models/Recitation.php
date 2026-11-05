<?php

declare(strict_types=1);

namespace App\Domains\Content\Models;

use Database\Factories\RecitationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'resource_id',
    'reciter_name',
    'reciter_name_ar',
    'style',
    'qirat',
    'has_word_segments',
])]
#[UseFactory(RecitationFactory::class)]
final class Recitation extends Model
{
    /** @use HasFactory<RecitationFactory> */
    use HasFactory;

    public $timestamps = false;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'has_word_segments' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<\App\Domains\Content\Models\Resource, $this>
     */
    public function resource(): BelongsTo
    {
        return $this->belongsTo(Resource::class);
    }

    /**
     * @return HasMany<ChapterAudioFile, $this>
     */
    public function chapterAudioFiles(): HasMany
    {
        return $this->hasMany(ChapterAudioFile::class);
    }

    /**
     * @return HasMany<TaybahTimingSet, $this>
     */
    public function taybahTimingSets(): HasMany
    {
        return $this->hasMany(TaybahTimingSet::class);
    }
}
