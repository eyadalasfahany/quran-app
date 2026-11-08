<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Models;

use Database\Factories\HadithExplanationFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

final class HadithExplanation extends Model
{
    /** @use HasFactory<HadithExplanationFactory> */
    use HasFactory;

    protected $table = 'hadith_explanations';

    public $incrementing = false;

    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'resource_id' => 'integer',
            'id' => 'integer',
            'source_id' => 'integer',
            'imported_at' => 'immutable_datetime',
        ];
    }

    protected static function newFactory(): HadithExplanationFactory
    {
        return HadithExplanationFactory::new();
    }
}
