<?php

declare(strict_types=1);

namespace App\Domains\Content\Services;

use App\Domains\Content\Models\Resource;
use App\Domains\Content\Repositories\Contracts\ContentChangeRepository;
use App\Domains\Content\Repositories\Contracts\ResourceRepository;

final class ResourceVersionService
{
    public function __construct(
        private readonly ResourceRepository $resources,
        private readonly ContentChangeRepository $changes,
    ) {}

    /**
     * Version +1 and changes_floor_version = new version (installed devices replace the whole pack), the resource's
     * content_changes deleted, resource saved. Call inside the caller's transaction.
     *
     * @return int<0, max> the new version
     */
    public function bumpWithFloor(Resource $resource): int
    {
        $version = $resource->version + 1;

        $resource->version = $version;
        $resource->changes_floor_version = $version;

        $this->changes->deleteForResource($resource->id);
        $this->resources->save($resource);

        return $version;
    }
}
