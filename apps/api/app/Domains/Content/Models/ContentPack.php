<?php

declare(strict_types=1);

namespace App\Domains\Content\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $resource_id
 * @property int $version
 * @property string $path
 * @property int $size_bytes
 * @property string $sha256
 * @property int $row_count
 * @property int $schema_version
 * @property CarbonImmutable $built_at
 */
#[Fillable([
    'resource_id',
    'version',
    'path',
    'size_bytes',
    'sha256',
    'row_count',
    'schema_version',
    'built_at',
])]
final class ContentPack extends Model
{
    public $timestamps = false;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'resource_id' => 'integer',
            'version' => 'integer',
            'size_bytes' => 'integer',
            'row_count' => 'integer',
            'schema_version' => 'integer',
            'built_at' => 'immutable_datetime',
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
