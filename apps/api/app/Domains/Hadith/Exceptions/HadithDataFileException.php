<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Exceptions;

use RuntimeException;

/**
 * A committed Hadith data file or a config value of the gap and chapter layer is missing its pin, fails its SHA-256, is
 * malformed, or names an unknown collection. Messages name a path, a slug, a number or a code, never file content.
 */
final class HadithDataFileException extends RuntimeException {}
