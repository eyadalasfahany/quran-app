<?php

declare(strict_types=1);

namespace App\Domains\Duas\Models;

use Database\Factories\DuaCollectionBookFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/** @use HasFactory<DuaCollectionBookFactory> */
final class DuaCollectionBook extends Model
{
    /** @use HasFactory<DuaCollectionBookFactory> */
    use HasFactory;

    protected $table = 'dua_collection_books';

    public $incrementing = false;

    public $timestamps = false;

    protected static function newFactory(): DuaCollectionBookFactory
    {
        return DuaCollectionBookFactory::new();
    }
}
