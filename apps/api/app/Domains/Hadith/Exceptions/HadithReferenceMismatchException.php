<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Exceptions;

use RuntimeException;

/**
 * A hadith sits in a section that disagrees with its reference.book, and the developer did not list it as an exception.
 * The message holds numbers only.
 */
final class HadithReferenceMismatchException extends RuntimeException
{
    /**
     * @param  list<string>  $hadithNumbers  At most the first 20 numbers.
     */
    public function __construct(
        public readonly string $slug,
        public readonly int $count,
        public readonly array $hadithNumbers,
    ) {
        parent::__construct(sprintf(
            'Collection [%s]: %d hadith are in a book that disagrees with reference.book. First numbers: %s.',
            $slug,
            $count,
            implode(', ', $hadithNumbers),
        ));
    }
}
