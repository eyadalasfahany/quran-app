<?php

declare(strict_types=1);

namespace App\Domains\Content\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Read-only mirror row for the Azkar pack snapshot (ADR 0031 §9). Composite keys are read through toBase().
 */
final class AzkarNote extends Model
{
    protected $table = 'azkar_notes';

    public $incrementing = false;

    public $timestamps = false;
}
