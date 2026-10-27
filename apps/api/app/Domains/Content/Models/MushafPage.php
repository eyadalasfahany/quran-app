<?php

declare(strict_types=1);

namespace App\Domains\Content\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'mushaf_id',
    'page_number',
    'first_verse_id',
    'last_verse_id',
    'first_word_id',
    'last_word_id',
    'verses_count',
    'verse_mapping',
])]
final class MushafPage extends Model
{
    public $incrementing = false;

    public $timestamps = false;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'verse_mapping' => 'array',
        ];
    }

    /**
     * @return BelongsTo<Mushaf, $this>
     */
    public function mushaf(): BelongsTo
    {
        return $this->belongsTo(Mushaf::class);
    }
}
