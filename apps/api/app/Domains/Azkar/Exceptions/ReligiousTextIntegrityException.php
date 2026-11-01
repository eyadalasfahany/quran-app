<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Exceptions;

use RuntimeException;

/**
 * A religious text could not be split and reassembled byte for byte (ADR 0031 §4). Never caught and repaired.
 */
final class ReligiousTextIntegrityException extends RuntimeException {}
