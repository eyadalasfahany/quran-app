<?php

declare(strict_types=1);

namespace App\Domains\Content\Data;

use Carbon\CarbonImmutable;
use Spatie\LaravelData\Data;

final class ContentManifestData extends Data
{
    /**
     * @param  list<ContentManifestEntryData>  $resources
     */
    public function __construct(
        public readonly CarbonImmutable $generatedAt,
        public readonly int $packSchemaVersion,
        public readonly array $resources,
    ) {}
}
