<?php

declare(strict_types=1);

namespace App\Domains\Names\Data;

final class NamesImportIssue
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
