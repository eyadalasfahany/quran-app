<?php

declare(strict_types=1);

namespace App\Domains\Content\Models;

use App\Domains\Azkar\Enums\AzkarEntryClass;
use Illuminate\Database\Eloquent\Model;

/**
 * Read-only mirror row for the Azkar pack snapshot (ADR 0031 §9). Composite keys are read through toBase().
 *
 * `entry_class` is set for reviewed rows only and never reaches the pack; `home` is 'duas' for a dua moved out of Azkar
 * (plan docs/plans/azkar-duas-split.md). Rows are written with query()->insert(), so no mass assignment is needed.
 */
final class AzkarEntry extends Model
{
    protected $table = 'azkar_entries';

    public $incrementing = false;

    public $timestamps = false;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'entry_class' => AzkarEntryClass::class,
        ];
    }
}
