<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Data;

use Spatie\LaravelData\Data;

final class HadithBookData extends Data
{
    public function __construct(
        public readonly string $bookNumber,
        public readonly ?string $titleAr,
        public readonly ?string $titleEn,
        public readonly int $position,
        public readonly int $hadithCount,
    ) {}
}
