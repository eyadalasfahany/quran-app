<?php

declare(strict_types=1);

namespace App\Domains\Content\Mp3Quran;

final readonly class Mp3QuranImportReport
{
    /**
     * @param  list<array{moshaf_id: int|null, reason: string}>  $skipped
     */
    public function __construct(
        public int $created,
        public int $updated,
        public int $unchanged,
        public int $hidden,
        public int $deactivated,
        public int $files,
        public int $surahsWithoutFile,
        public array $skipped,
    ) {}

    public function hasProblems(): bool
    {
        return $this->skipped !== [];
    }
}
