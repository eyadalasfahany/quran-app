<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Repositories\Contracts;

use App\Domains\Azkar\Data\ImportPlan;
use App\Domains\Content\Enums\PermissionStatus;

interface AzkarImportRepository
{
    public function sourcePermissionStatus(string $code): ?PermissionStatus;

    /**
     * @return array<string, string> item_key => source_text_sha256 of the rows currently stored for the resource
     */
    public function itemTextHashes(int $resourceId): array;

    /**
     * Deletes every Azkar row of the resource, then inserts the plan. Children are deleted before parents.
     */
    public function replaceForResource(int $resourceId, ImportPlan $plan): void;
}
