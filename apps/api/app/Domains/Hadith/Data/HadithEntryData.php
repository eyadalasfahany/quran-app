<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Data;

use Spatie\LaravelData\Data;

final class HadithEntryData extends Data
{
    /**
     * A null grades list means grades are not visible: the response has no grades key.
     */
    public function __construct(
        public readonly string $hadithNumber,
        public readonly ?string $arabicNumber,
        public readonly int $position,
        public readonly string $textAr,
        public readonly ?string $sourceUrl,
        public readonly string $bookNumber,
        public readonly ?int $chapterNumber,
        /** @var list<HadithGradeData>|null */
        public readonly ?array $grades,
        public readonly ?string $numberFirst = null,
        public readonly ?string $numberLast = null,
        public readonly ?string $sourceCode = null,
    ) {}
}
