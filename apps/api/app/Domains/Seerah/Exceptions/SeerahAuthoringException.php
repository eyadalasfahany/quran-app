<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Exceptions;

use RuntimeException;

/**
 * An authoring tool cannot do what it was asked (a word is missing, a batch is unknown). Messages name ids and words the caller typed,
 * never book text.
 */
final class SeerahAuthoringException extends RuntimeException {}
