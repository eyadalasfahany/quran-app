<?php

declare(strict_types=1);

namespace App\Domains\Content\Models;

use App\Domains\Content\Enums\PermissionStatus;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property string $code
 * @property PermissionStatus $permission_status
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
#[Fillable(['code', 'name', 'licence_url', 'attribution_ar', 'attribution_en', 'permission_status', 'notes'])]
final class ContentSource extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'permission_status' => PermissionStatus::class,
            'created_at' => 'immutable_datetime',
            'updated_at' => 'immutable_datetime',
        ];
    }

    /**
     * @return HasMany<\App\Domains\Content\Models\Resource, $this>
     */
    public function resources(): HasMany
    {
        return $this->hasMany(Resource::class, 'source_id');
    }
}
