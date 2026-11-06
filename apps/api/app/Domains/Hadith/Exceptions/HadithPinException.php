<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Exceptions;

use RuntimeException;

/**
 * A pin is missing or a file does not match its pinned SHA-256. Nothing is written for the file (ADR 0042 §4).
 */
final class HadithPinException extends RuntimeException {}
