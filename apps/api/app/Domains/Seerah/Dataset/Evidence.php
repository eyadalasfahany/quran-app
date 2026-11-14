<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Dataset;

/**
 * A quote from the book: a paragraph id and the exact substring of that paragraph's canonical text (V3). Never typed by hand:
 * `seerah:quote` prints it.
 */
final readonly class Evidence
{
    public function __construct(
        public string $para,
        public string $quote,
    ) {}
}
