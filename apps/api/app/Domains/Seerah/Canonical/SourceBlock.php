<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Canonical;

use App\Domains\Seerah\Enums\BlockKind;

/**
 * A heading, paragraph or footnote with the continuation lines (`~~`) that join it.
 */
final class SourceBlock
{
    /**
     * @param  list<SourceLine>  $lines
     */
    public function __construct(
        public readonly BlockKind $kind,
        public array $lines,
    ) {}
}
