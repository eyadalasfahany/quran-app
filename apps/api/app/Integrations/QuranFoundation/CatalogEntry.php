<?php

declare(strict_types=1);

namespace App\Integrations\QuranFoundation;

final readonly class CatalogEntry
{
    public function __construct(
        public int $id,
        public string $name,
        public ?string $authorName,
        public ?string $languageName,
        public ?string $slug,
        public ?string $nameAr = null,
    ) {}
}
