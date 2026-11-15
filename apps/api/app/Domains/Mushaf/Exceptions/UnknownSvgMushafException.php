<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Exceptions;

/**
 * No configured mushaf edition has that key.
 */
final class UnknownSvgMushafException extends SvgMushafException {}
