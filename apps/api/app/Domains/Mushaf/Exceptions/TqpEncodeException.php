<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Exceptions;

/**
 * A page SVG the TQP1 encoder cannot represent: bad XML, an unsupported viewBox, transform or path command, or a delta too large
 * for 32 bits. Import and pack build refuse the page (ADR 0090 amendment of 26 Nov 2026).
 */
final class TqpEncodeException extends SvgMushafException {}
