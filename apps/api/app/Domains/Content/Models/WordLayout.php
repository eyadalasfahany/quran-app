<?php

declare(strict_types=1);

namespace App\Domains\Content\Models;

use Database\Factories\WordLayoutFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'mushaf_id',
    'word_id',
    'verse_id',
    'position_in_verse',
    'char_type',
    'glyph',
    'page',
    'line',
    'position_in_line',
])]
#[UseFactory(WordLayoutFactory::class)]
final class WordLayout extends Model
{
    /** @use HasFactory<WordLayoutFactory> */
    use HasFactory;

    public $incrementing = false;

    public $timestamps = false;

    /**
     * @return BelongsTo<Mushaf, $this>
     */
    public function mushaf(): BelongsTo
    {
        return $this->belongsTo(Mushaf::class);
    }
}
