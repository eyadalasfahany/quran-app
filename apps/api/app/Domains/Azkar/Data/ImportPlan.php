<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Data;

use Spatie\LaravelData\Data;

/**
 * The transformed rows for the eight canonical tables, without resource_id. Built in memory; written only on a wet import.
 */
final class ImportPlan extends Data
{
    /**
     * @param  list<array<string, int|string|null>>  $chapters
     * @param  list<array<string, int|string|null>>  $entries
     * @param  list<array<string, int|string|null>>  $items
     * @param  list<array<string, int|string|null>>  $segments
     * @param  list<array<string, int|string|null>>  $categories
     * @param  list<array<string, int|string|null>>  $entryCategories
     * @param  list<array<string, int|string|null>>  $notes
     * @param  list<array<string, int|string|null>>  $recordings
     */
    public function __construct(
        public readonly array $chapters,
        public readonly array $entries,
        public readonly array $items,
        public readonly array $segments,
        public readonly array $categories,
        public readonly array $entryCategories,
        public readonly array $notes,
        public readonly array $recordings,
        public readonly ImportStats $stats,
    ) {}
}
