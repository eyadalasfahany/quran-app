<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Data;

use Spatie\LaravelData\Data;

final class HadithGradeData extends Data
{
    public function __construct(
        public readonly string $grade,
        public readonly string $gradedBy,
    ) {}
}
