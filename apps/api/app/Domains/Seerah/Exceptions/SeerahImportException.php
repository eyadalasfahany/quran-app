<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Exceptions;

use RuntimeException;

/**
 * An import cannot start or cannot map its data: a refused mode, a conflicting option, or a reference to a record that is not in the
 * data. Messages name an option, a file or an id, never book text.
 */
final class SeerahImportException extends RuntimeException {}
