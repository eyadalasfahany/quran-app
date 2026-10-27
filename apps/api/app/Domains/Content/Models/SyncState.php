<?php

declare(strict_types=1);

namespace App\Domains\Content\Models;

use App\Domains\Content\Enums\SyncEnvironment;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * @property SyncEnvironment $environment
 * @property int<0, max> $last_sequence
 * @property CarbonImmutable|null $last_success_at
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
#[Fillable([
    'environment',
    'resource_group',
    'resources_filter',
    'sync_token',
    'last_sequence',
    'last_success_at',
    'last_error',
])]
final class SyncState extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'environment' => SyncEnvironment::class,
            'last_sequence' => 'integer',
            'last_success_at' => 'immutable_datetime',
            'created_at' => 'immutable_datetime',
            'updated_at' => 'immutable_datetime',
        ];
    }
}
