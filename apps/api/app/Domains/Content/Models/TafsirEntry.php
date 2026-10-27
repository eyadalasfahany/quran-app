<?php

declare(strict_types=1);

namespace App\Domains\Content\Models;

use Database\Factories\TafsirEntryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'resource_id',
    'group_tafsir_id',
    'first_verse_id',
    'last_verse_id',
    'first_verse_key',
    'last_verse_key',
    'html',
    'source_hash',
])]
#[UseFactory(TafsirEntryFactory::class)]
final class TafsirEntry extends Model
{
    /** @use HasFactory<TafsirEntryFactory> */
    use HasFactory;

    public $timestamps = false;

    /**
     * @return BelongsTo<\App\Domains\Content\Models\Resource, $this>
     */
    public function resource(): BelongsTo
    {
        return $this->belongsTo(Resource::class);
    }
}
