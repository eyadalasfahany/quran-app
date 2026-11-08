<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Exceptions;

use RuntimeException;

/**
 * ADR 0078: the links file or the explanation import refuses to continue. The message names the rule, never a text.
 */
final class HadithExplanationException extends RuntimeException {}
