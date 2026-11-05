<?php

declare(strict_types=1);

namespace App\Domains\Content\Timings;

/**
 * What one import run did. With --dry-run the counts are what a wet run would do.
 */
final readonly class TaybahImportReport
{
    /**
     * @param  list<array{path: string, reason: string}>  $skipped
     */
    public function __construct(
        public int $filesSeen,
        public int $imported,
        public int $unchanged,
        public int $versionBumps,
        public int $segmentsNulled,
        public array $skipped,
    ) {}

    public function hasProblems(): bool
    {
        return $this->skipped !== [];
    }
}
