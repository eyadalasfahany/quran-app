<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Dataset;

/**
 * A paragraph range inside one section, both ends inclusive (data-format.md, `span`).
 */
final readonly class Span
{
    public function __construct(
        public string $from,
        public string $to,
    ) {}
}
