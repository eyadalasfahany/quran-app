<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Dataset;

use App\Domains\Seerah\Enums\ExclusionReason;

/**
 * A section with no event, and why (exclusions.json).
 */
final readonly class Exclusion
{
    public function __construct(
        public string $section,
        public ExclusionReason $reason,
        public ?string $note,
    ) {}
}
