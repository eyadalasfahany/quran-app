<?php

declare(strict_types=1);

namespace App\Domains\Content\Models;

use App\Domains\Content\Enums\SyncEnvironment;
use App\Domains\Content\Enums\SyncRunStatus;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * @property SyncEnvironment $environment
 * @property SyncRunStatus $status
 * @property int<0, max> $mutations_applied
 * @property CarbonImmutable $started_at
 * @property CarbonImmutable|null $finished_at
 */
#[Fillable([
    'environment',
    'resource_group',
    'started_at',
    'finished_at',
    'status',
    'mutations_applied',
    'error',
])]
final class SyncRun extends Model
{
    public $timestamps = false;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'environment' => SyncEnvironment::class,
            'status' => SyncRunStatus::class,
            'mutations_applied' => 'integer',
            'started_at' => 'immutable_datetime',
            'finished_at' => 'immutable_datetime',
        ];
    }
}
