<?php

declare(strict_types=1);

namespace App\Domains\Content\Models;

use Illuminate\Database\Eloquent\Model;

/** Read-only mirror row for the Names pack snapshot (ADR 0043). */
final class NamesNote extends Model
{
    protected $table = 'names_notes';

    public $incrementing = false;

    public $timestamps = false;
}
