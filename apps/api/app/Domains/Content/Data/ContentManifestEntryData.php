<?php

declare(strict_types=1);

namespace App\Domains\Content\Data;

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Enums\TextDirection;
use Spatie\LaravelData\Data;

final class ContentManifestEntryData extends Data
{
    public function __construct(
        public readonly int $id,
        public readonly ResourceGroup $group,
        public readonly ?string $name,
        public readonly ?string $nameAr,
        public readonly ?string $authorName,
        public readonly ?string $languageCode,
        public readonly ?TextDirection $direction,
        public readonly int $version,
        public readonly int $packSizeBytes,
        public readonly string $packSha256,
        public readonly int $changesSinceMinVersion,
    ) {}
}
