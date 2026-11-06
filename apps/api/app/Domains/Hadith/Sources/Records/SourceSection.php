<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Sources\Records;

/**
 * A section of a collection with its number range, as the source gives it.
 */
final readonly class SourceSection
{
    public function __construct(
        public string $key,
        public ?string $titleEn,
        public ?string $firstHadithNumber,
        public ?string $lastHadithNumber,
        public ?string $firstArabicNumber,
        public ?string $lastArabicNumber,
    ) {}
}
