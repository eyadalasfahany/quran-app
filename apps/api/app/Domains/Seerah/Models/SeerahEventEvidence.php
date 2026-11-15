<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Models;

use Database\Factories\SeerahEventEvidenceFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * ADR 0091 evidence quote. Composite keys (resource_id, id) are read with where(), never find(), save() or update(). Rows are written by
 * the importer in one transaction and replaced on every run; Arabic text columns are byte-exact (utf8mb4_0900_bin).
 *
 * @property int $resource_id
 * @property int $event_id
 * @property string $kind
 * @property int $position
 * @property int $paragraph_id
 * @property string $quote_ar
 */
final class SeerahEventEvidence extends Model
{
    /** @use HasFactory<SeerahEventEvidenceFactory> */
    use HasFactory;

    protected $table = 'seerah_event_evidence';

    public $incrementing = false;

    public $timestamps = false;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'resource_id' => 'integer',
            'event_id' => 'integer',
            'position' => 'integer',
            'paragraph_id' => 'integer',
        ];
    }

    protected static function newFactory(): SeerahEventEvidenceFactory
    {
        return SeerahEventEvidenceFactory::new();
    }
}
