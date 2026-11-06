<?php

declare(strict_types=1);

namespace App\Domains\Content\Mp3Quran;

use InvalidArgumentException;

/**
 * Chapter audio file ids for MP3Quran files sit above the QF record range (ADR 0061): BASE + moshaf * 1000 + surah.
 */
final class Mp3QuranFileId
{
    public const int BASE = ReciterSource::MP3QURAN_FILE_ID_BASE;

    public static function for(int $moshafId, int $surah, ?ReciterSource $source = null): int
    {
        $base = ($source ?? ReciterSource::mp3quran())->fileIdBase;

        if ($moshafId < 1) {
            throw new InvalidArgumentException('The MP3Quran moshaf id must be 1 or more.');
        }

        if ($surah < 1 || $surah > 114) {
            throw new InvalidArgumentException('The surah must be between 1 and 114.');
        }

        return $base + $moshafId * 1000 + $surah;
    }
}
