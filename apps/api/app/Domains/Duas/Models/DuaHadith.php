<?php

declare(strict_types=1);

namespace App\Domains\Duas\Models;

use Database\Factories\DuaHadithFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/** @use HasFactory<DuaHadithFactory> */
final class DuaHadith extends Model
{
    /** @use HasFactory<DuaHadithFactory> */
    use HasFactory;

    protected $table = 'dua_hadith';

    public $incrementing = false;

    public $timestamps = false;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'hints' => 'array',
            'imported_at' => 'datetime',
        ];
    }

    protected static function newFactory(): DuaHadithFactory
    {
        return DuaHadithFactory::new();
    }
}
