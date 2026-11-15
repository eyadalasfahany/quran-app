<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Canonical;

/**
 * One line of the source after its line-start marker has been read: `body` is the text after the marker, untouched.
 */
final readonly class SourceLine
{
    public function __construct(
        public int $number,
        public string $body,
    ) {}
}
