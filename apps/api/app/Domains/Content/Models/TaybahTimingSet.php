<?php

declare(strict_types=1);

namespace App\Domains\Content\Models;

use App\Domains\Content\Enums\TaybahTimingSource;
use Carbon\CarbonImmutable;
use Database\Factories\TaybahTimingSetFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Provenance of one Taybah-made timing set (one recitation and surah file).
 *
 * @property int $id
 * @property int $recitation_id
 * @property int $chapter_id
 * @property string $audio_url
 * @property int $size_bytes
 * @property string $sha256
 * @property int $measured_duration_ms
 * @property TaybahTimingSource $source
 * @property string|null $tool_version
 * @property array<string, mixed>|null $models
 * @property int|null $original_first_start_ms
 * @property string $digest
 * @property CarbonImmutable $imported_at
 */
#[Fillable([
    'recitation_id',
    'chapter_id',
    'audio_url',
    'size_bytes',
    'sha256',
    'measured_duration_ms',
    'source',
    'tool_version',
    'models',
    'original_first_start_ms',
    'digest',
    'imported_at',
])]
#[UseFactory(TaybahTimingSetFactory::class)]
final class TaybahTimingSet extends Model
{
    /** @use HasFactory<TaybahTimingSetFactory> */
    use HasFactory;

    public $timestamps = false;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'source' => TaybahTimingSource::class,
            'models' => 'array',
            'imported_at' => 'immutable_datetime',
        ];
    }

    /**
     * @return BelongsTo<Recitation, $this>
     */
    public function recitation(): BelongsTo
    {
        return $this->belongsTo(Recitation::class);
    }
}
