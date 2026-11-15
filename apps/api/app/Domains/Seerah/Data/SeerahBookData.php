<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Data;

use Spatie\LaravelData\Data;

/**
 * One served Seerah book (ADR 0091). The pack resource id is the id the app installs by.
 */
final class SeerahBookData extends Data
{
    public function __construct(
        public readonly int $resourceId,
        public readonly string $slug,
        public readonly string $titleAr,
        public readonly string $authorAr,
        public readonly string $editionAr,
        public readonly string $attributionAr,
        public readonly string $attributionEn,
        public readonly int $sectionsCount,
        public readonly int $paragraphsCount,
        public readonly int $placesCount,
        public readonly int $eventsCount,
        public readonly int $routesCount,
    ) {}
}
