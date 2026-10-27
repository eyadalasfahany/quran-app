<?php

declare(strict_types=1);

namespace App\Domains\Content\Data;

use Spatie\LaravelData\Data;

final class ContentChangesQueryData extends Data
{
    public function __construct(
        public readonly int $resourceId,
        public readonly int $sinceVersion,
        public readonly int $limit,
        public readonly ?int $afterId,
    ) {}
}
