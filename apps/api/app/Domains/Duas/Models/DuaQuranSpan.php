<?php

declare(strict_types=1);

namespace App\Domains\Duas\Models;

use Database\Factories\DuaQuranSpanFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/** @use HasFactory<DuaQuranSpanFactory> */
final class DuaQuranSpan extends Model
{
    /** @use HasFactory<DuaQuranSpanFactory> */
    use HasFactory;

    protected $table = 'dua_quran_spans';

    public $incrementing = false;

    public $timestamps = false;

    protected static function newFactory(): DuaQuranSpanFactory
    {
        return DuaQuranSpanFactory::new();
    }
}
