<?php

declare(strict_types=1);

namespace App\Domains\Names\Data;

use Spatie\LaravelData\Data;

final class NamesImportIssue extends Data
{
    public const string ERROR = 'error';

    public function __construct(
        public readonly string $severity,
        public readonly string $code,
        public readonly string $path,
    ) {}

    public function isError(): bool
    {
        return $this->severity === self::ERROR;
    }
}
