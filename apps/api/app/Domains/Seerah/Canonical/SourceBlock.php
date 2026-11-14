<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Canonical;

/**
 * A paragraph or a heading wrapper line with the continuation lines that join it. `headingWrap` is true for a `# | ` line.
 */
final class SourceBlock
{
    /**
     * @param  list<SourceLine>  $lines
     */
    public function __construct(
        public readonly bool $headingWrap,
        public array $lines,
    ) {}
}
