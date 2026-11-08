<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Models;

use Database\Factories\HadithExplanationLinkFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

final class HadithExplanationLink extends Model
{
    /** @use HasFactory<HadithExplanationLinkFactory> */
    use HasFactory;

    protected $table = 'hadith_explanation_links';

    public $incrementing = false;

    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'resource_id' => 'integer',
            'explanation_id' => 'integer',
        ];
    }

    protected static function newFactory(): HadithExplanationLinkFactory
    {
        return HadithExplanationLinkFactory::new();
    }
}
