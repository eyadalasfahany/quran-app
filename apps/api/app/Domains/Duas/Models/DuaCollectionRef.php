<?php

declare(strict_types=1);

namespace App\Domains\Duas\Models;

use Database\Factories\DuaCollectionRefFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/** @use HasFactory<DuaCollectionRefFactory> */
final class DuaCollectionRef extends Model
{
    /** @use HasFactory<DuaCollectionRefFactory> */
    use HasFactory;

    protected $table = 'dua_collection_refs';

    public $incrementing = false;

    public $timestamps = false;

    protected static function newFactory(): DuaCollectionRefFactory
    {
        return DuaCollectionRefFactory::new();
    }
}
