<?php

declare(strict_types=1);

namespace App\Domains\Content\Enums;

enum TaybahTimingSource: string
{
    /** Made by tools/recitation-align. */
    case Aligner = 'aligner';

    /** MP3Quran's own published ayah timings, normalised. */
    case Mp3QuranPublished = 'mp3quran_published';
}
