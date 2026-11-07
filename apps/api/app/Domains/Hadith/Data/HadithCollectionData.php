<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Data;

use Spatie\LaravelData\Data;

final class HadithCollectionData extends Data
{
    public function __construct(
        public readonly int $resourceId,
        public readonly string $slug,
        public readonly ?string $titleAr,
        public readonly ?string $titleEn,
        public readonly ?string $authorAr,
        public readonly ?string $authorEn,
        public readonly string $attributionAr,
        public readonly string $attributionEn,
        public readonly ?string $sourceUrl,
        public readonly int $totalHadith,
        public readonly int $booksCount,
    ) {}
}
