<?php

declare(strict_types=1);

namespace App\Domains\Content\Models;

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Enums\TextDirection;
use Carbon\CarbonImmutable;
use Database\Factories\ResourceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property int $id
 * @property string|null $name
 * @property string|null $name_ar
 * @property string|null $author_name
 * @property string|null $language_code
 * @property bool $is_active
 * @property string|null $import_fingerprint
 * @property string|null $unavailable_reason
 * @property ResourceGroup $group
 * @property TextDirection|null $direction
 * @property int<0, max> $version
 * @property int<0, max> $changes_floor_version
 * @property int<0, max>|null $source_content_id
 * @property int<0, max>|null $source_sequence
 * @property CarbonImmutable|null $synced_at
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
#[Fillable([
    'source_id',
    'group',
    'source_key',
    'source_content_id',
    'name',
    'name_ar',
    'author_name',
    'language_name',
    'language_code',
    'direction',
    'version',
    'changes_floor_version',
    'source_sequence',
    'checksum',
    'is_active',
    'unavailable_reason',
    'synced_at',
])]
#[UseFactory(ResourceFactory::class)]
final class Resource extends Model
{
    /** @use HasFactory<ResourceFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'group' => ResourceGroup::class,
            'direction' => TextDirection::class,
            'version' => 'integer',
            'changes_floor_version' => 'integer',
            'source_content_id' => 'integer',
            'source_sequence' => 'integer',
            'is_active' => 'boolean',
            'synced_at' => 'immutable_datetime',
            'created_at' => 'immutable_datetime',
            'updated_at' => 'immutable_datetime',
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
     * @return HasMany<TafsirEntry, $this>
     */
    public function tafsirEntries(): HasMany
    {
        return $this->hasMany(TafsirEntry::class);
    }

    /**
     * @return HasMany<ContentChange, $this>
     */
    public function contentChanges(): HasMany
    {
        return $this->hasMany(ContentChange::class);
    }

    /**
     * @return HasMany<ContentPack, $this>
     */
    public function contentPacks(): HasMany
    {
        return $this->hasMany(ContentPack::class);
    }

    /**
     * @return HasOne<Mushaf, $this>
     */
    public function mushaf(): HasOne
    {
        return $this->hasOne(Mushaf::class);
    }

    /**
     * @return HasOne<Recitation, $this>
     */
    public function recitation(): HasOne
    {
        return $this->hasOne(Recitation::class);
    }
}
