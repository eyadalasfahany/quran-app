<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Exceptions;

use RuntimeException;

/**
 * A downloaded file is not the shape the parser expects. Messages name the file and the key, never its content.
 */
final class HadithSourceFormatException extends RuntimeException {}
