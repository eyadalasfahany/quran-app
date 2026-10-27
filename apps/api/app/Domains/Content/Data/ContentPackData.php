<?php

declare(strict_types=1);

namespace App\Domains\Content\Data;

use Carbon\CarbonImmutable;
use Spatie\LaravelData\Data;

final class ContentPackData extends Data
{
    public function __construct(
        public readonly int $resourceId,
        public readonly int $version,
        public readonly string $path,
        public readonly int $sizeBytes,
        public readonly string $sha256,
        public readonly int $rowCount,
        public readonly int $schemaVersion,
        public readonly CarbonImmutable $builtAt,
    ) {}
}
