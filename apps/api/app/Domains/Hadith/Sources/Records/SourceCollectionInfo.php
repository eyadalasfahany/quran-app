<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Sources\Records;

/**
 * Counts and names for one collection, read from the index file. No hadith text.
 */
final readonly class SourceCollectionInfo
{
    public function __construct(
        public string $slug,
        public string $sourceSlug,
        public ?string $titleEn,
        public ?string $lastHadithNumber,
        public int $hadithCount,
        public int $sectionCount,
    ) {}
}
