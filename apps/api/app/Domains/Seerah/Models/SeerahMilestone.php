<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Models;

use Database\Factories\SeerahMilestoneFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * ADR 0091 milestone. Composite keys (resource_id, id) are read with where(), never find(), save() or update(). Rows are written by
 * the importer in one transaction and replaced on every run; Arabic text columns are byte-exact (utf8mb4_0900_bin).
 *
 * @property int $resource_id
 * @property string $milestone_key
 * @property string $label_ar
 * @property int $event_id
 * @property int $position
 */
final class SeerahMilestone extends Model
{
    /** @use HasFactory<SeerahMilestoneFactory> */
    use HasFactory;

    protected $table = 'seerah_milestones';

    public $incrementing = false;

    public $timestamps = false;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'resource_id' => 'integer',
            'event_id' => 'integer',
            'position' => 'integer',
        ];
    }

    protected static function newFactory(): SeerahMilestoneFactory
    {
        return SeerahMilestoneFactory::new();
    }
}
