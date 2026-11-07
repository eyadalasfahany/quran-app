<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Exceptions;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * @extends ModelNotFoundException<Model>
 *
 * A collection that is not served (unknown, held back or without a pack) gives this one answer. It renders as the
 * existing 404 not_found with a translated detail (no renderer change, ADR 0042 amendment 7 Nov 2026).
 */
final class HadithCollectionUnavailableException extends ModelNotFoundException
{
    public function __construct()
    {
        parent::__construct(__('problems.hadith_collection_unavailable_detail'));
    }
}
