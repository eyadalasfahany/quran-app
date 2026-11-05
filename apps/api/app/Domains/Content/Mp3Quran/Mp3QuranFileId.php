<?php

declare(strict_types=1);

namespace App\Domains\Content\Mp3Quran;

use InvalidArgumentException;

/**
 * Chapter audio file ids for MP3Quran files sit above the QF record range (ADR 0061): BASE + moshaf * 1000 + surah.
 */
final class Mp3QuranFileId
{
    public const int BASE = 1_000_000_000;

    public static function for(int $moshafId, int $surah): int
    {
        if ($moshafId < 1) {
            throw new InvalidArgumentException('The MP3Quran moshaf id must be 1 or more.');
        }

        if ($surah < 1 || $surah > 114) {
            throw new InvalidArgumentException('The surah must be between 1 and 114.');
        }

        return self::BASE + $moshafId * 1000 + $surah;
    }
}
