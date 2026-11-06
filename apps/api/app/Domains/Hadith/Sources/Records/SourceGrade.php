<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Sources\Records;

/**
 * One grade as the source gives it, text exactly as received. Stored with its grader; never shown (grades_visible is false).
 */
final readonly class SourceGrade
{
    public function __construct(
        public ?string $gradedBy,
        public string $grade,
    ) {}
}
