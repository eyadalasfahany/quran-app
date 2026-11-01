<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Exceptions;

use RuntimeException;

/**
 * The catalogue file cannot be read or decoded. The code is the report code (ADR 0031 §3).
 */
final class CatalogueUnreadableException extends RuntimeException
{
    public function __construct(
        public readonly string $issueCode,
        string $message,
    ) {
        parent::__construct($message);
    }
}
