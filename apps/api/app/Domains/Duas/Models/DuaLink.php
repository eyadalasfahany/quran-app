<?php

declare(strict_types=1);

namespace App\Domains\Duas\Models;

use Database\Factories\DuaLinkFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/** @use HasFactory<DuaLinkFactory> */
final class DuaLink extends Model
{
    /** @use HasFactory<DuaLinkFactory> */
    use HasFactory;

    protected $table = 'dua_links';

    public $incrementing = false;

    public $timestamps = false;

    protected static function newFactory(): DuaLinkFactory
    {
        return DuaLinkFactory::new();
    }
}
