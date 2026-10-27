<?php

declare(strict_types=1);

namespace App\Domains\Content\Repositories\Contracts;

use App\Domains\Content\Data\ContentChangeData;
use App\Domains\Content\Models\ContentChange;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;

interface ContentChangeRepository
{
    public function insert(int $resourceId, int $version, ContentChangeData $change): void;

    public function minimumVersionAfter(int $resourceId, int $sinceVersion): ?int;

    /**
     * @return Collection<int, ContentChange>
     */
    public function after(int $resourceId, int $sinceVersion, ?int $afterId, int $limit): Collection;

    public function deleteCreatedBefore(CarbonImmutable $before): void;
}
