<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Dataset;

use App\Domains\Seerah\Enums\FlagCode;

/**
 * The developer's decision on a flagged record: the codes it settles and the note. The assignment itself is written into the
 * record, so the record's hash covers it.
 */
final readonly class Decision
{
    /**
     * @param  list<FlagCode>  $codes
     */
    public function __construct(
        public array $codes,
        public string $note,
    ) {}
}
