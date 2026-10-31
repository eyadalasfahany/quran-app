<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Sources;

use App\Domains\Azkar\Contracts\HadithReferenceSource;
use App\Domains\Azkar\Data\HadithReferenceQuery;
use App\Domains\Azkar\Data\HadithReferenceResult;
use Carbon\CarbonImmutable;

/**
 * Used whenever Dorar is not configured or not enabled. Makes no requests.
 */
final class NullHadithReferenceSource implements HadithReferenceSource
{
    public function isAvailable(): bool
    {
        return false;
    }

    public function lookup(HadithReferenceQuery $query): HadithReferenceResult
    {
        return HadithReferenceResult::none(CarbonImmutable::now());
    }
}
