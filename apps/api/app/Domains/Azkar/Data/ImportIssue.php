<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Data;

use Spatie\LaravelData\Data;

/**
 * One problem or gap found in the catalogue. Carries keys and paths only, never religious text (ADR 0031 §3).
 */
final class ImportIssue extends Data
{
    public const string ERROR = 'error';

    public const string WARNING = 'warning';

    public function __construct(
        public readonly string $severity,
        public readonly string $code,
        public readonly string $path,
        public readonly ?int $entryIndex = null,
        public readonly ?string $entryKey = null,
    ) {}

    public function isError(): bool
    {
        return $this->severity === self::ERROR;
    }
}
