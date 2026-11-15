<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Exceptions;

use RuntimeException;

/**
 * Base for every SVG mushaf import failure. The command prints the message and exits non-zero; nothing is written to the
 * database (ADR 0090 decision 7).
 */
class SvgMushafException extends RuntimeException {}
