<?php

declare(strict_types=1);

namespace App\Domains\Content\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['audio_file_id', 'verse_id', 'verse_key', 'start_ms', 'end_ms', 'segments'])]
final class RecitationTiming extends Model
{
    public $incrementing = false;

    public $timestamps = false;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'segments' => 'array',
        ];
    }

    /**
     * @return BelongsTo<ChapterAudioFile, $this>
     */
    public function audioFile(): BelongsTo
    {
        return $this->belongsTo(ChapterAudioFile::class, 'audio_file_id');
    }
}
