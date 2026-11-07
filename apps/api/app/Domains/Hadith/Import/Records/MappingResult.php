<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Import\Records;

/**
 * The mapper's output for one collection: the plan, the counts and the issues found while mapping.
 */
final readonly class MappingResult
{
    /**
     * @param  list<HadithIssue>  $issues
     */
    public function __construct(
        public HadithImportPlan $plan,
        public CollectionStats $stats,
        public array $issues,
    ) {}
}
