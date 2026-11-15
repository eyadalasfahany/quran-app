<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Review;

/**
 * One record that needs a sign-off: its group (G, E1 to E4, M), its id in that group, and the SHA-256 of its current content.
 */
final readonly class ReviewRecord
{
    public function __construct(
        public string $group,
        public string $id,
        public string $hash,
    ) {}
}
