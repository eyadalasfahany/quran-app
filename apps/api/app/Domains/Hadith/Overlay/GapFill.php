<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Overlay;

/**
 * A hadith number with no text in the edition, filled from an origin (ADR 0076, step 6b.4). The text is stored byte for byte.
 */
final readonly class GapFill
{
    public function __construct(
        public string $number,
        public string $origin,
        public string $sourceKey,
        public ?int $unit,
        public string $text,
        public string $sourceTextSha256,
    ) {}
}
