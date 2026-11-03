<?php

declare(strict_types=1);

namespace App\Domains\Duas\Models;

use Database\Factories\DuaItemFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/** @use HasFactory<DuaItemFactory> */
final class DuaItem extends Model
{
    /** @use HasFactory<DuaItemFactory> */
    use HasFactory;

    protected $table = 'dua_items';

    public $incrementing = false;

    public $timestamps = false;

    protected static function newFactory(): DuaItemFactory
    {
        return DuaItemFactory::new();
    }
}
