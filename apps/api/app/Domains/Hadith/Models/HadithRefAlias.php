<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Models;

use App\Domains\Content\Models\Resource;
use App\Domains\Hadith\Enums\HadithAliasMatch;
use Database\Factories\HadithRefAliasFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Composite keys (resource_id, old_number, since_version): read with where(), never find(), save() or update().
 *
 * @property int $resource_id
 * @property string $old_number
 * @property string|null $new_number
 * @property HadithAliasMatch $match
 * @property int $since_version
 */
final class HadithRefAlias extends Model
{
    /** @use HasFactory<HadithRefAliasFactory> */
    use HasFactory;

    protected $table = 'hadith_ref_aliases';

    public $incrementing = false;

    public $timestamps = false;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'resource_id' => 'integer',
            'since_version' => 'integer',
            'match' => HadithAliasMatch::class,
        ];
    }

    /**
     * @return BelongsTo<resource, $this>
     */
    public function resource(): BelongsTo
    {
        return $this->belongsTo(Resource::class, 'resource_id');
    }

    protected static function newFactory(): HadithRefAliasFactory
    {
        return HadithRefAliasFactory::new();
    }
}
