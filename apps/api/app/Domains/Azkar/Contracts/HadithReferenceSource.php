<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Contracts;

use App\Domains\Azkar\Data\HadithReferenceQuery;
use App\Domains\Azkar\Data\HadithReferenceResult;

/**
 * Optional hadith reference lookup (ADR 0031 §2). The offline Azkar reader never depends on it.
 */
interface HadithReferenceSource
{
    public function isAvailable(): bool;

    public function lookup(HadithReferenceQuery $query): HadithReferenceResult;
}
