<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Services;

/**
 * The output of hadith:build-gaps for one collection: the proposal bytes (a gaps file, unpinned) and the report (counts, numbers
 * and codes only). Built in memory; the command writes it under storage/app.
 */
final readonly class GapBuildResult
{
    /**
     * @param  array<string, mixed>  $report
     */
    public function __construct(
        public string $proposalJson,
        public array $report,
    ) {}
}
