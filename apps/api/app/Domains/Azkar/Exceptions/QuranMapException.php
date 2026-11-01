<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Exceptions;

use RuntimeException;

/**
 * The bundled Tanzil text or the Quran reference map cannot be read or generated (ADR 0031 §4).
 */
final class QuranMapException extends RuntimeException {}
