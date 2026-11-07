<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Import\Records;

/**
 * The text-integrity check of stored rows against the plan. Keys only in firstKeys, never text.
 */
final readonly class IntegrityResult
{
    /**
     * @param  list<string>  $firstKeys  At most 20 source keys.
     */
    public function __construct(
        public int $expected,
        public int $stored,
        public int $storedHashMismatches,
        public int $sourceMismatches,
        public int $missing,
        public int $extra,
        public array $firstKeys,
    ) {}

    public function ok(): bool
    {
        return $this->storedHashMismatches === 0
            && $this->sourceMismatches === 0
            && $this->missing === 0
            && $this->extra === 0
            && $this->expected === $this->stored;
    }
}
