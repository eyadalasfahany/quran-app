<?php

declare(strict_types=1);

namespace App\Domains\Names\Exceptions;

use RuntimeException;

/** Thrown when import or pack build runs while the Names content source is not granted (ADR 0043 A2). */
final class NamesSourceLockedException extends RuntimeException {}
