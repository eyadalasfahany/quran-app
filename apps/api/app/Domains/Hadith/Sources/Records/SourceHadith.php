<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Sources\Records;

/**
 * One hadith as the source gives it. Numbers are text: a hadith number can be decimal (e.g. 2787.2).
 */
final readonly class SourceHadith
{
    /**
     * @param  list<SourceGrade>  $grades
     */
    public function __construct(
        public string $number,
        public ?string $arabicNumber,
        public ?string $text,
        public array $grades,
        public ?string $referenceBook,
        public ?string $referenceHadith,
    ) {}
}
