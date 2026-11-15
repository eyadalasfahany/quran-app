<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Exceptions;

use RuntimeException;

/**
 * The stored paragraphs do not match the canonical text after the write (ADR 0091, step 23). The transaction is rolled back. The
 * message carries counts only, never text.
 */
final class SeerahIntegrityException extends RuntimeException {}
