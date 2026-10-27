<?php

declare(strict_types=1);

namespace App\Domains\Content\Models;

use Database\Factories\MushafFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'id',
    'resource_id',
    'name',
    'description',
    'pages_count',
    'lines_per_page',
    'default_font_name',
    'mapping_mode',
    'qirat_name',
])]
#[UseFactory(MushafFactory::class)]
final class Mushaf extends Model
{
    /** @use HasFactory<MushafFactory> */
    use HasFactory;

    public $incrementing = false;

    public $timestamps = false;

    /**
     * @return BelongsTo<\App\Domains\Content\Models\Resource, $this>
     */
    public function resource(): BelongsTo
    {
        return $this->belongsTo(Resource::class);
    }

    /**
     * @return HasMany<MushafPage, $this>
     */
    public function pages(): HasMany
    {
        return $this->hasMany(MushafPage::class);
    }

    /**
     * @return HasMany<WordLayout, $this>
     */
    public function wordLayouts(): HasMany
    {
        return $this->hasMany(WordLayout::class);
    }
}
