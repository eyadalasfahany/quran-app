<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Validation;

/**
 * One finding. `where` names a file, a record id or a section id; `message` never contains book text (ids and counts only).
 */
final readonly class Issue
{
    public function __construct(
        public string $rule,
        public Severity $severity,
        public string $where,
        public string $message,
    ) {}
}
