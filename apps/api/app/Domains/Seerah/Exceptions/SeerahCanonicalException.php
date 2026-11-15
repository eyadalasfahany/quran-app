<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Exceptions;

use RuntimeException;

/**
 * The pinned source or its canonical text cannot be used: a pin or SHA-256 differs, the header is missing, a line is unparsed,
 * or a value is out of the closed list. Messages name a path, a line number or a code, never book text.
 */
final class SeerahCanonicalException extends RuntimeException {}
