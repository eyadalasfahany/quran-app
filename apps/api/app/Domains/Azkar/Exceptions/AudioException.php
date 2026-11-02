<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Exceptions;

use RuntimeException;

/**
 * The Azkar audio manifest is missing, unpinned or unreadable. Nothing is downloaded or imported from it (ADR 0040).
 */
final class AudioException extends RuntimeException {}
