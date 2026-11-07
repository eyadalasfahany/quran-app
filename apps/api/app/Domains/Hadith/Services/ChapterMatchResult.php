<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Services;

/**
 * The output of hadith:match-chapters for one collection: the proposal bytes (a chapters file, unpinned) and the report (counts,
 * numbers and codes only). Built in memory; the command writes it under storage/app.
 */
final readonly class ChapterMatchResult
{
    /**
     * @param  array<string, mixed>  $report
     */
    public function __construct(
        public string $proposalJson,
        public array $report,
    ) {}
}
