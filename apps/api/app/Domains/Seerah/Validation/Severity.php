<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Validation;

/**
 * How serious an issue is. An error fails the command; a warning is listed; info is a count or a note.
 */
enum Severity: string
{
    case Error = 'error';
    case Warning = 'warning';
    case Info = 'info';
}
