<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Dataset;

use App\Domains\Seerah\Enums\FlagCode;

/**
 * An open decision on a record, with its note (data-format.md, `flags`).
 */
final readonly class Flag
{
    public function __construct(
        public FlagCode $code,
        public ?string $note,
    ) {}
}
