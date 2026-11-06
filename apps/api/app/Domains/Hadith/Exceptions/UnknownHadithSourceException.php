<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Exceptions;

use InvalidArgumentException;

/**
 * No registered Hadith source has that code.
 */
final class UnknownHadithSourceException extends InvalidArgumentException {}
