<?php

declare(strict_types=1);

namespace App\Domains\Content\Enums;

/**
 * The content source that owns a recitation's resource. Also the folder name under resources/recitation-timings.
 */
enum TaybahTimingKind: string
{
    case Qf = 'qf';
    case Mp3Quran = 'mp3quran';
}
