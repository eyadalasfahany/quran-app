<?php

declare(strict_types=1);

namespace App\Domains\Content\Mp3Quran;

final readonly class Mp3QuranFile
{
    public function __construct(
        public int $surah,
        public string $key,
        public string $url,
        public string $sha256,
        public int $bytes,
        public int $durationMs,
        public ?int $firstAyah = null,
        public ?int $lastAyah = null,
    ) {}
}
