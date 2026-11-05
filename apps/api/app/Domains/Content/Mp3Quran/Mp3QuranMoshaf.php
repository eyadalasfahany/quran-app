<?php

declare(strict_types=1);

namespace App\Domains\Content\Mp3Quran;

final readonly class Mp3QuranMoshaf
{
    /**
     * @param  list<int>  $surahList
     * @param  list<Mp3QuranFile>  $files  sorted by surah
     */
    public function __construct(
        public int $moshafId,
        public string $nameAr,
        public string $nameEn,
        public string $riwayah,
        public string $moshafName,
        public array $surahList,
        public array $files,
    ) {}
}
