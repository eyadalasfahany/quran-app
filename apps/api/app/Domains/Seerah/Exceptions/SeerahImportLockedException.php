<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Exceptions;

use RuntimeException;

/**
 * Another Seerah import holds the lock (Cache::lock, seerah:import), so this run writes nothing.
 */
final class SeerahImportLockedException extends RuntimeException {}
