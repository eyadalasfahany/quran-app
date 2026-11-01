<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Data;

use Spatie\LaravelData\Data;

/**
 * The output of flattening one variation: its items, the problems found, and the recording objects seen.
 */
final class FlattenedVariation extends Data
{
    /**
     * @param  list<FlatItem>  $items
     * @param  list<ImportIssue>  $issues
     * @param  list<string>  $recordingIds  One id per recording object seen; an empty string when the id is missing.
     */
    public function __construct(
        public readonly array $items,
        public readonly array $issues,
        public readonly array $recordingIds,
    ) {}
}
