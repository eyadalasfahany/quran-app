<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Canonical;

/**
 * One run of the canonicalizer over the pinned source: the book, the SHA-256 of the source bytes and of the canonical text,
 * and whether the pins were checked (a run over another file, for tests, does not check them).
 */
final readonly class CanonicalBuild
{
    public function __construct(
        public CanonicalBook $book,
        public string $sourceSha256,
        public string $canonicalSha256,
        public bool $pinsChecked,
        public bool $canonicalPinMissing,
    ) {}
}
