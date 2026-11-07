<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Exceptions;

use RuntimeException;

/**
 * A dev-only gap or chapter build cannot proceed: a pin differs, a required option is missing, or an extra book fails its
 * two-way rule. Messages name a path, a slug or a code, never text or titles.
 */
final class HadithGapBuildException extends RuntimeException {}
