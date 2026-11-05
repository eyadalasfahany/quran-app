<?php

declare(strict_types=1);

namespace App\Domains\Content\Models;

use Database\Factories\TaybahRecitationTimingFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['recitation_id', 'chapter_id', 'verse_id', 'start_ms', 'end_ms', 'segments'])]
#[UseFactory(TaybahRecitationTimingFactory::class)]
final class TaybahRecitationTiming extends Model
{
    /** @use HasFactory<TaybahRecitationTimingFactory> */
    use HasFactory;

    public $incrementing = false;

    public $timestamps = false;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'segments' => 'array',
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
