<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Data;

use Spatie\LaravelData\Data;

final class HadithChapterData extends Data
{
    public function __construct(
        public readonly int $chapterNumber,
        public readonly ?string $titleAr,
        public readonly ?string $titleEn,
        public readonly int $position,
        public readonly int $hadithCount,
    ) {}
}
