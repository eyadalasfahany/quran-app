<?php

declare(strict_types=1);

namespace App\Domains\Content\Mp3Quran;

final readonly class Mp3QuranManifestData
{
    /**
     * @param  list<Mp3QuranMoshaf>  $moshafs
     * @param  list<array{moshaf_id: int|null, reason: string}>  $invalid
     */
    public function __construct(
        public string $publicBase,
        public array $moshafs,
        public array $invalid,
    ) {}
}
