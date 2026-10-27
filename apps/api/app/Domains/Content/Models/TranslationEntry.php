<?php

declare(strict_types=1);

namespace App\Domains\Content\Models;

use Database\Factories\TranslationEntryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['resource_id', 'verse_id', 'verse_key', 'text', 'footnotes', 'source_record_id'])]
#[UseFactory(TranslationEntryFactory::class)]
final class TranslationEntry extends Model
{
    /** @use HasFactory<TranslationEntryFactory> */
    use HasFactory;

    public $incrementing = false;

    public $timestamps = false;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'verse_id' => 'integer',
            'footnotes' => 'array',
            'source_record_id' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<\App\Domains\Content\Models\Resource, $this>
     */
    public function resource(): BelongsTo
    {
        return $this->belongsTo(Resource::class);
    }
}
