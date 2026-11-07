<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Import\Records;

/**
 * One validation finding. Subject is a hadith number, a section key or null. It never holds hadith text.
 */
final readonly class HadithIssue
{
    public const string SEVERITY_ERROR = 'error';

    public const string SEVERITY_WARNING = 'warning';

    public function __construct(
        public string $severity,
        public string $code,
        public ?string $subject,
    ) {}
}
