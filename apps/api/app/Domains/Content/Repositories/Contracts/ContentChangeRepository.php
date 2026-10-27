<?php

declare(strict_types=1);

namespace App\Domains\Content\Repositories\Contracts;

use App\Domains\Content\Data\ContentChangeData;

interface ContentChangeRepository
{
    public function insert(int $resourceId, int $version, ContentChangeData $change): void;
}
