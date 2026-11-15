<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Exceptions;

/**
 * A file is missing, unreachable, not in the manifest, malformed, or fails its pinned blob SHA and size (check A1).
 */
final class SvgMushafSourceException extends SvgMushafException {}
