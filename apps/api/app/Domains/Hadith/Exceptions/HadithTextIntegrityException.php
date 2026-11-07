<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Exceptions;

use RuntimeException;

/**
 * Stored text differs from the source. Thrown inside the collection's transaction, so the whole collection rolls back.
 * The message holds counts only.
 */
final class HadithTextIntegrityException extends RuntimeException
{
    public function __construct(string $slug, int $altered, int $differ, int $missing, int $extra)
    {
        parent::__construct(sprintf(
            'Collection [%s]: stored text differs from the source (%d altered, %d differ from the source hash, %d missing, %d extra). Nothing was written.',
            $slug,
            $altered,
            $differ,
            $missing,
            $extra,
        ));
    }
}
