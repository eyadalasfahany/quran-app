<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Import\Records;

/**
 * The rows to write for one collection. Rows carry no resource_id; the repository adds it. Chapters stay empty in step 6
 * (ADR 0076 seam).
 */
final readonly class HadithImportPlan
{
    /**
     * @param  array<string, int|string|null>  $collection  One row.
     * @param  list<array<string, int|string|null>>  $books
     * @param  list<array<string, int|string|null>>  $chapters
     * @param  list<array<string, int|string|null>>  $entries
     * @param  list<array<string, int|string|null>>  $grades
     */
    public function __construct(
        public array $collection,
        public array $books,
        public array $chapters,
        public array $entries,
        public array $grades,
    ) {}
}
