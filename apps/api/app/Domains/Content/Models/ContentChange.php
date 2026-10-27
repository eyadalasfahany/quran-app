<?php

declare(strict_types=1);

namespace App\Domains\Content\Models;

use App\Domains\Content\Enums\ChangeOperation;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property CarbonImmutable|null $created_at
 */
#[Fillable(['resource_id', 'version', 'entity', 'entity_key', 'op', 'payload'])]
final class ContentChange extends Model
{
    public const UPDATED_AT = null;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'op' => ChangeOperation::class,
            'payload' => 'array',
            'created_at' => 'immutable_datetime',
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
