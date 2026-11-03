<?php

declare(strict_types=1);

namespace App\Domains\Content\Models;

use Illuminate\Database\Eloquent\Model;

/** Read-only mirror row for the Names pack snapshot (ADR 0043). */
final class Name extends Model
{
    protected $table = 'names';

    public $incrementing = false;

    public $timestamps = false;
}
