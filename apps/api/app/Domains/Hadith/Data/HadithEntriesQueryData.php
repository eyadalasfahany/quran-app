<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Data;

use Spatie\LaravelData\Data;

final class HadithEntriesQueryData extends Data
{
    public function __construct(
        public readonly int $limit,
        public readonly ?int $afterPosition,
        public readonly ?int $chapterNumber,
    ) {}
}
