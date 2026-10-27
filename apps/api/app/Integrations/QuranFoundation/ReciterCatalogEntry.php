<?php

declare(strict_types=1);

namespace App\Integrations\QuranFoundation;

final readonly class ReciterCatalogEntry
{
    public function __construct(
        public int $id,
        public string $name,
        public ?string $style,
        public ?string $qirat,
        public ?string $translatedName,
    ) {}
}
