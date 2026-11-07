<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Exceptions;

use RuntimeException;

/**
 * A developer-approved range correction is malformed, names an unknown collection, or names a section the source does not
 * have. Messages name a slug or a section number, never text.
 */
final class HadithRangeCorrectionException extends RuntimeException {}
