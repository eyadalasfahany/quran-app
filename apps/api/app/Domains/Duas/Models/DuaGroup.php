<?php

declare(strict_types=1);

namespace App\Domains\Duas\Models;

use Database\Factories\DuaGroupFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/** @use HasFactory<DuaGroupFactory> */
final class DuaGroup extends Model
{
    /** @use HasFactory<DuaGroupFactory> */
    use HasFactory;

    protected $table = 'dua_groups';

    public $incrementing = false;

    public $timestamps = false;

    protected static function newFactory(): DuaGroupFactory
    {
        return DuaGroupFactory::new();
    }
}
