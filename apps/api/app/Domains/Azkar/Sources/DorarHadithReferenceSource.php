<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Sources;

use App\Domains\Azkar\Contracts\HadithReferenceSource;
use App\Domains\Azkar\Data\HadithReferenceQuery;
use App\Domains\Azkar\Data\HadithReferenceResult;
use App\Integrations\Dorar\DorarResponseMapper;

/**
 * Dorar behind the HadithReferenceSource contract. Bound only when Dorar is configured and enabled.
 * It does not call DorarClient yet: there are no documented endpoints to call, so the mapper throws
 * before any request is made. Add the client here together with the endpoint and the mapper.
 */
final class DorarHadithReferenceSource implements HadithReferenceSource
{
    public function __construct(
        private readonly DorarResponseMapper $mapper,
    ) {}

    public function isAvailable(): bool
    {
        return true;
    }

    public function lookup(HadithReferenceQuery $query): HadithReferenceResult
    {
        return $this->mapper->map($query->text, $query->page);
    }
}
