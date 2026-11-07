<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Exceptions;

use RuntimeException;

/**
 * Another Hadith import holds the lock. Nothing is written by this run.
 */
final class HadithImportLockedException extends RuntimeException {}
